import { parseJson } from "@/app/lib/api/validation";
import { apiError, ok } from "@/app/lib/api/response";
import { getPool, withTranscations } from "@/app/lib/api/client";
import { createLeaveRequestSchema } from "@/app/validations/phase1_schema";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function GET(request: Request) {
  const client = await getPool().connect();

  try {
    const { searchParams } = new URL(request.url);
    const authuser = await getAuthenticatedUser(request);
    const isHR = authuser.roles.includes("hr");

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const limit = Math.max(
      1,
      Math.min(100, Number(searchParams.get("limit")) || 20),
    );
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const offset = (page - 1) * limit;

    const queryParams: any[] = [];
    const whereConditions: string[] = [];

   
    if (!isHR) {
      
      queryParams.push(authuser.sub);
      whereConditions.push(`e.keycloak_id = $${queryParams.length}`);
    } else {
      if (status) {
        queryParams.push(status);
        whereConditions.push(`lr.status = $${queryParams.length}`);
      }

      if (search) {
        queryParams.push(`%${search}%`);
        whereConditions.push(`(
          e.first_name ILIKE $${queryParams.length} OR
          e.last_name ILIKE $${queryParams.length} OR
          e.display_name ILIKE $${queryParams.length} OR
          lt.name ILIKE $${queryParams.length}
        )`);
      }
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    const listQuery = `
      SELECT 
        lr.id AS request_id,
        e.id AS employee_id,
        COALESCE(e.display_name, CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
        e.profile_photo_url,
        des.title AS department,
        lt.name AS leave_type,
        lr.total_days,
        lr.half_day_type,
        CASE 
          WHEN lr.half_day_type IS NOT NULL AND lr.half_day_type != 'full_day' THEN lr.half_day_type
          WHEN lr.total_days = 1 THEN '1 Day'
          ELSE CONCAT(lr.total_days, ' Days')
        END AS duration_display,
        lr.start_date,
        lr.end_date,
        lr.status,
        lr.reason,
        lr.rejection_reason,
        lr.created_at
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      LEFT JOIN designations des ON e.designation_id = des.id
      LEFT JOIN departments d ON e.department_id = d.id
      ${whereClause}
      ORDER BY lr.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM leave_requests lr
      JOIN employees e ON lr.employee_id = e.id
      JOIN leave_types lt ON lr.leave_type_id = lt.id
      ${whereClause}
    `;

    const [listResult, countResult] = await Promise.all([
      client.query(listQuery, [...queryParams, limit, offset]),
      client.query(countQuery, queryParams),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    return ok({
      success: true,
      data: listResult.rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching leave requests list:", error);
    return apiError(
      "UNAUTHORIZED",
      error.message || "Failed to fetch leave requests list",
      401,
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  const client = await getPool().connect();

  try {
    const authuser = await getAuthenticatedUser(request);
    const isHR = authuser.roles.includes("hr");

    const parsed = await parseJson(request, createLeaveRequestSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    let targetEmployeeId = data.employee_id;

    if (!isHR) {
      const empResult = await client.query(
        `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authuser.sub],
      );

      if (empResult.rows.length === 0) {
        return apiError("NOT_FOUND", "Employee profile not found", 404);
      }

      targetEmployeeId = empResult.rows[0].id;
    }

    const newLeave = await withTranscations(async (txClient) => {
      const insertquery = `
        INSERT INTO leave_requests (
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          half_day_type,
          status,
          reason
        ) 
        VALUES (
          $1, 
          (SELECT id FROM leave_types WHERE code = $2), 
          $3, 
          $4, 
          $5, 
          $6, 
          $7, 
          $8
        )
        RETURNING *;
      `;

      const values = [
        targetEmployeeId,
        data.leave_code,
        data.start_date,
        data.end_date,
        data.total_days,
        data.half_day_type,
        data.status || "pending",
        data.reason || null,
      ];

      const result = await txClient.query(insertquery, values);
      if (result.rowCount === 0) {
        throw new Error("Leave type code not found in database");
      }

      return result.rows[0];
    });

    return ok({
      message: "Leave request submitted successfully",
      data: newLeave,
    });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to create leave request", 500);
  } finally {
    client.release();
  }
}