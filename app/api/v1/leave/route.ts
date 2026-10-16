import { parseJson } from "@/app/lib/api/validation";
import { apiError, ok } from "@/app/lib/api/response";
import { getPool, withTranscations } from "@/app/lib/api/client";
import { createLeaveRequestSchema } from "@/app/validations/phase1_schema";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { createNotification } from "@/app/lib/api/notifications";

export async function GET(request: Request) {
  const client = await getPool().connect();

  try {
    const { searchParams } = new URL(request.url);
    const authuser = await getAuthenticatedUser(request);
    const roles = (authuser.roles || []).map((r: string) => r.toLowerCase());
    const isHR = ["hr", "hr_admin", "hradmin", "admin", "system_admin"].some((role) => roles.includes(role));
    const isManager = roles.includes("manager") || roles.includes("super_manager");

    const search = searchParams.get("search");
    const status = searchParams.get("status");
    const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit")) || 50));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const offset = (page - 1) * limit;

    const queryParams: any[] = [];
    const whereConditions: string[] = [];

    if (isHR) {
      // HR ko:
      // 1. Dusron ki wahi leaves dikhe jahan manager_approval_status = 'Approved'
      // 2. Apni khud ki SAARI leaves dikhe (OR e.keycloak_id = $authuser.sub)
      queryParams.push(authuser.sub);
      whereConditions.push(
        `(lr.manager_approval_status = 'Approved' OR e.keycloak_id = $${queryParams.length})`
      );

      if (status) {
        queryParams.push(status);
        whereConditions.push(`lr.status = $${queryParams.length}`);
      }
    } else if (isManager) {
      // Manager ko:
      // 1. Apni team ki leaves (e.reporting_manager_id = manager_id)
      // 2. Apni KHUD ki leaves (e.keycloak_id = manager_keycloak_id)
      queryParams.push(authuser.sub);
      whereConditions.push(
        `(e.reporting_manager_id = (SELECT id FROM employees WHERE keycloak_id = $${queryParams.length}) OR e.super_manager_id = (SELECT id FROM employees WHERE keycloak_id = $${queryParams.length}) OR e.keycloak_id = $${queryParams.length})`
      );

      if (status) {
        queryParams.push(status);
        whereConditions.push(`lr.status = $${queryParams.length}`);
      }
    } else {
      // Normal Employee ko sirf apni leaves dikhe
      queryParams.push(authuser.sub);
      whereConditions.push(`e.keycloak_id = $${queryParams.length}`);

      if (status) {
        queryParams.push(status);
        whereConditions.push(`lr.status = $${queryParams.length}`);
      }
    }

    if (search && isHR) {
      queryParams.push(`%${search}%`);
      whereConditions.push(`(
        e.first_name ILIKE $${queryParams.length} OR
        e.last_name ILIKE $${queryParams.length} OR
        e.display_name ILIKE $${queryParams.length} OR
        lt.name ILIKE $${queryParams.length}
      )`);
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    const listQuery = `
      SELECT
        lr.id AS request_id,
        e.id AS employee_id,
        e.keycloak_id,
        e.work_email AS employee_email,
        e.reporting_manager_id,
        COALESCE(e.display_name, CONCAT(e.first_name, ' ', e.last_name)) AS employee_name,
        e.profile_photo_url,
        des.title AS department,
        lt.name AS leave_type,
        lt.id AS leave_type_id,
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
        lr.manager_approval_status,
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
    return apiError("UNAUTHORIZED", error.message || "Failed to fetch leave requests list", 401);
  } finally {
    client.release();
  }
}


export async function POST(request: Request) {
  const client = await getPool().connect();

  try {
    const authuser = await getAuthenticatedUser(request);
    const roles = (authuser.roles || []).map((r: string) => r.toLowerCase());
    const isAdmin = roles.includes("admin") || roles.includes("system_admin");
    const isHR = ["hr", "hr_admin", "hradmin"].some((role) => roles.includes(role));
    const isManager = roles.includes("manager") || roles.includes("super_manager");

    const parsed = await parseJson(request, createLeaveRequestSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    // Fetch Actor Employee Details (System Roles & Manager ID)
    const actorEmpRes = await client.query(
      `SELECT id, system_role, reporting_manager_id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authuser.sub]
    );

    if (actorEmpRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Employee profile not found", 404);
    }

    const actorEmployeeId = actorEmpRes.rows[0].id;
    let targetEmployeeId = actorEmployeeId;

    let initialManagerStatus = "Pending";
    let initialOverallStatus = "Pending";

    // Check target employee vs actor employee
    const isApplyingForSelf = !data.employee_id || data.employee_id === actorEmployeeId;

    if (isAdmin) {
      // ADMIN: Highest authority - Can approve anyone directly including self
      if (data.employee_id) {
        targetEmployeeId = data.employee_id;
      }
      initialManagerStatus = "Approved";
      initialOverallStatus = data.status || "Approved";

    } else if (isHR) {
      if (!isApplyingForSelf) {
        // HR applying for OTHER employees -> Auto Pre-Approved by HR
        targetEmployeeId = data.employee_id;
        initialManagerStatus = "Approved";
        initialOverallStatus = data.status || "Approved";
      } else {
        // HR applying for SELF -> Needs Reporting Manager & Admin approval
        targetEmployeeId = actorEmployeeId;
        initialManagerStatus = "Pending";
        initialOverallStatus = "Pending";
      }

    } else if (isManager) {
      if (!isApplyingForSelf) {
        // Manager applying for DIRECT REPORT team members
        const reportCheck = await client.query(
          `SELECT id FROM employees WHERE id = $1 AND reporting_manager_id = $2 LIMIT 1`,
          [data.employee_id, actorEmployeeId]
        );
        if (reportCheck.rows.length === 0) {
          return apiError(
            "FORBIDDEN",
            "You can only apply leave for your direct report team members",
            403
          );
        }
        targetEmployeeId = data.employee_id;
        initialManagerStatus = "Approved"; // Manager pre-approved
        initialOverallStatus = "Pending";  // Pending final HR/Admin approval
      } else {
        // Manager applying for SELF
        targetEmployeeId = actorEmployeeId;
        initialManagerStatus = "Pending";
        initialOverallStatus = "Pending";
      }

    } else {
      // Normal Employee applying for SELF
      targetEmployeeId = actorEmployeeId;
      initialManagerStatus = "Pending";
      initialOverallStatus = "Pending";
    }

    const isHalfDay =
      data.half_day_type === "first_half" || data.half_day_type === "second_half";
    const totalDaysToDeduct = isHalfDay ? 0.5 : Number(data.total_days);

    // Half-Day Limit Validations
    if (isHalfDay) {
      const startDate = new Date(data.start_date);
      const reqYear = startDate.getFullYear();
      const reqMonth = startDate.getMonth() + 1;

      const monthCheck = await client.query(
        `SELECT COUNT(*) AS count
         FROM leave_requests
         WHERE employee_id = $1
           AND half_day_type IN ('first_half', 'second_half')
           AND status != 'Rejected'
           AND EXTRACT(YEAR FROM start_date) = $2
           AND EXTRACT(MONTH FROM start_date) = $3`,
        [targetEmployeeId, reqYear, reqMonth]
      );

      const monthlyHalfDays = parseInt(monthCheck.rows[0].count, 10);
      if (monthlyHalfDays >= 2) {
        return apiError(
          "VALIDATION_ERROR",
          "Maximum monthly limit of 2 half-days reached for this month!",
          400
        );
      }

      const yearCheck = await client.query(
        `SELECT COUNT(*) AS count
         FROM leave_requests
         WHERE employee_id = $1
           AND half_day_type IN ('first_half', 'second_half')
           AND status != 'Rejected'
           AND EXTRACT(YEAR FROM start_date) = $2`,
        [targetEmployeeId, reqYear]
      );

      const yearlyHalfDays = parseInt(yearCheck.rows[0].count, 10);
      if (yearlyHalfDays >= 24) {
        return apiError(
          "VALIDATION_ERROR",
          "Maximum yearly limit of 24 half-days reached for this year.",
          400
        );
      }
    }

    // Insert Request & Notify
    const newLeave = await withTranscations(async (txClient) => {
      const insertQuery = `
        INSERT INTO leave_requests (
          employee_id,
          leave_type_id,
          start_date,
          end_date,
          total_days,
          half_day_type,
          status,
          manager_approval_status,
          manager_approved_by,
          manager_action_at,
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
          $8,
          $9,
          ${initialManagerStatus === "Approved" ? "NOW()" : "NULL"},
          $10
        )
        RETURNING *;
      `;

      const values = [
        targetEmployeeId,
        data.leave_code,
        data.start_date,
        data.end_date,
        totalDaysToDeduct,
        data.half_day_type || "full_day",
        initialOverallStatus,
        initialManagerStatus,
        initialManagerStatus === "Approved" ? actorEmployeeId : null,
        data.reason || null,
      ];

      const result = await txClient.query(insertQuery, values);
      if (result.rowCount === 0) {
        throw new Error("Leave type code not found in database");
      }

      const createdLeaveRequest = result.rows[0];

      // Fetch employee & reporting manager details
      const empDetailsRes = await txClient.query(
        `SELECT
           COALESCE(display_name, CONCAT(first_name, ' ', last_name)) AS employee_name,
           reporting_manager_id
         FROM employees
         WHERE id = $1 LIMIT 1`,
        [targetEmployeeId]
      );

      const employeeName = empDetailsRes.rows[0]?.employee_name || "An employee";
      const managerId = empDetailsRes.rows[0]?.reporting_manager_id;

      // Notifications logic
      if (isHR && isApplyingForSelf && managerId) {
        // Notification for HR's Reporting Manager
        await createNotification(txClient, {
          recipientId: managerId,
          title: "New HR Leave Request",
          message: `${employeeName} (HR) requested ${totalDaysToDeduct} day(s) of leave starting ${data.start_date}. Awaiting your manager review.`,
          type: "leave_requested",
          referenceId: createdLeaveRequest.id,
          referenceType: "leave_requests",
        });
      } else if (initialManagerStatus === "Approved" && !isAdmin) {
        // Notify employee that Manager/HR applied on their behalf
        await createNotification(txClient, {
          recipientId: targetEmployeeId,
          title: "Leave Applied & Pre-approved",
          message: `Your leave request for ${totalDaysToDeduct} day(s) has been created and pre-approved by your manager/HR.`,
          type: "leave_manager_approved",
          referenceId: createdLeaveRequest.id,
          referenceType: "leave_requests",
        });
      } else if (managerId && !isAdmin) {
        // Standard notification to Reporting Manager
        await createNotification(txClient, {
          recipientId: managerId,
          title: "New Leave Request",
          message: `${employeeName} requested ${totalDaysToDeduct} day(s) of leave (${data.leave_code}) starting ${data.start_date}.`,
          type: "leave_requested",
          referenceId: createdLeaveRequest.id,
          referenceType: "leave_requests",
        });
      }

      return createdLeaveRequest;
    });

    return ok({
      message: "Leave request submitted successfully",
      data: newLeave,
    });
  } catch (error: any) {
    console.error("Error creating leave request:", error);
    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to create leave request",
      500
    );
  } finally {
    client.release();
  }
}
