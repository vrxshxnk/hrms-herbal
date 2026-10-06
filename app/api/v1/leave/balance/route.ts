import { apiError, ok } from "@/app/lib/api/response";
import { getPool } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

// 1. Define Strategy Map
const leaveBalanceStrategies = {
  // HR / Admin: Read all employees' balances
  "leave:read:all": (_userId: string, year: number) => ({
    query: `
      SELECT 
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        e.employee_code,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'leave_type_id', lt.id,
              'leave_type_name', lt.name,
              'leave_type_code', lt.code,
              'total_leaves_avail', COALESCE(b.total_leaves_avail, 15.0),
              'monthly_limit', COALESCE(b.monthly_limit, 1.5),
              'used_leaves', COALESCE(b.used_leaves, 0.0),
              'remaining_leaves', (COALESCE(b.total_leaves_avail, 15.0) - COALESCE(b.used_leaves, 0.0))
            )
          ) FILTER (WHERE lt.id IS NOT NULL), '[]'::json
        ) AS balances
      FROM employees e
      CROSS JOIN leave_types lt
      LEFT JOIN employee_leave_balances b 
        ON lt.id = b.leave_type_id 
       AND e.id = b.employee_id 
       AND b.year = $1
      GROUP BY e.id, e.first_name, e.last_name, e.employee_code, e.profile_photo_url
      ORDER BY e.first_name ASC
    `,
    params: [year],
  }),

  // Manager: Read self + direct reports' balances
  "leave:read:team": (userId: string, year: number) => ({
    query: `
      SELECT 
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        e.employee_code,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'leave_type_id', lt.id,
              'leave_type_name', lt.name,
              'leave_type_code', lt.code,
              'total_leaves_avail', COALESCE(b.total_leaves_avail, 15.0),
              'monthly_limit', COALESCE(b.monthly_limit, 1.5),
              'used_leaves', COALESCE(b.used_leaves, 0.0),
              'remaining_leaves', (COALESCE(b.total_leaves_avail, 15.0) - COALESCE(b.used_leaves, 0.0))
            )
          ) FILTER (WHERE lt.id IS NOT NULL), '[]'::json
        ) AS balances
      FROM employees e
      CROSS JOIN leave_types lt
      LEFT JOIN employee_leave_balances b 
        ON lt.id = b.leave_type_id 
       AND e.id = b.employee_id 
       AND b.year = $1
      WHERE (e.id = $2 OR e.reporting_manager_id = $2)
      GROUP BY e.id, e.first_name, e.last_name, e.employee_code, e.profile_photo_url
      ORDER BY e.first_name ASC
    `,
    params: [year, userId],
  }),

  // Employee: Read self balance only
  "leave:read:self": (userId: string, year: number) => ({
    query: `
      SELECT 
        e.id AS employee_id,
        e.first_name,
        e.last_name,
        e.employee_code,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'leave_type_id', lt.id,
              'leave_type_name', lt.name,
              'leave_type_code', lt.code,
              'total_leaves_avail', COALESCE(b.total_leaves_avail, 15.0),
              'monthly_limit', COALESCE(b.monthly_limit, 1.5),
              'used_leaves', COALESCE(b.used_leaves, 0.0),
              'remaining_leaves', (COALESCE(b.total_leaves_avail, 15.0) - COALESCE(b.used_leaves, 0.0))
            )
          ) FILTER (WHERE lt.id IS NOT NULL), '[]'::json
        ) AS balances
      FROM employees e
      CROSS JOIN leave_types lt
      LEFT JOIN employee_leave_balances b 
        ON lt.id = b.leave_type_id 
       AND e.id = b.employee_id 
       AND b.year = $1
      WHERE e.id = $2
      GROUP BY e.id, e.first_name, e.last_name, e.employee_code, e.profile_photo_url
    `,
    params: [year, userId],
  }),
};

// 2. GET API Handler
export async function GET(request: Request) {
  const client = await getPool().connect();
  try {
    const authuser = await getAuthenticatedUser(request);
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || `${new Date().getFullYear()}`, 10);

    // Fetch employee DB ID
    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authuser.sub]
    );

    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee record not found.", 404);
    }

    const employeeId = empRes.rows[0].id;
    const roles = authuser.roles || [];

    // Resolve Strategy Permission
    let strategyKey: keyof typeof leaveBalanceStrategies = "leave:read:self";
    if (roles.includes("hr") || roles.includes("admin")) {
      strategyKey = "leave:read:all";
    } else if (roles.includes("manager")) {
      strategyKey = "leave:read:team";
    }

    const strategy = leaveBalanceStrategies[strategyKey];
    const { query, params } = strategy(employeeId, year);

    const result = await client.query(query, params);

    return ok({
      strategy: strategyKey,
      year,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching leave balances:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch leave balance data", 500);
  } finally {
    client.release();
  }
}




export async function POST(request: Request) {
  const client = await getPool().connect();
  try {
    const authuser = await getAuthenticatedUser(request);
    const roles = authuser.roles || [];

    if (!roles.includes("hr") && !roles.includes("admin")) {
      return apiError("FORBIDDEN", "Only HR or Admin can manage leave balances.", 403);
    }
    const body = await request.json();
    const { employee_id, leave_type_id, year, total_leaves_avail, monthly_limit } = body;
    if (!employee_id || !leave_type_id) {
      return apiError("BAD_REQUEST", "Employee ID and Leave Type ID are required.", 400);
    }
    const targetYear = year || new Date().getFullYear();
    const totalAvail = total_leaves_avail ?? 15.0;
    const monthLimit = monthly_limit ?? 1.5;
    const upsertQuery = `
      INSERT INTO employee_leave_balances (
        employee_id,
        leave_type_id,
        year,
        total_leaves_avail,
        monthly_limit,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      ON CONFLICT (employee_id, leave_type_id, year)
      DO UPDATE SET
        total_leaves_avail = EXCLUDED.total_leaves_avail,
        monthly_limit = EXCLUDED.monthly_limit,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;

    if (employee_id === "UNIVERSAL") {
      await client.query("BEGIN");
      const employeesResult = await client.query(`SELECT id FROM employees`);
      const allEmployeeIds: string[] = employeesResult.rows.map((row) => row.id);
      if (allEmployeeIds.length === 0) {
        await client.query("ROLLBACK");
        return apiError("NOT_FOUND", "No employees found to allocate balances to.", 444);
      }

      const upsertPromises = allEmployeeIds.map((empId) =>
        client.query(upsertQuery, [
          empId,
          leave_type_id,
          targetYear,
          totalAvail,
          monthLimit,
        ])
      );

      const results = await Promise.all(upsertPromises);
      await client.query("COMMIT");

      return ok({
        message: `Leave balance successfully updated for all ${allEmployeeIds.length} employees.`,
        data: {
          affected_count: results.length,
          updated_records: results.map((r) => r.rows[0]),
        },
      });
    }

    const result = await client.query(upsertQuery, [
      employee_id,
      leave_type_id,
      targetYear,
      totalAvail,
      monthLimit,
    ]);

    return ok({
      message: "Leave balance successfully updated.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error upserting leave balance:", error);
    return apiError("INTERNAL_ERROR", "Failed to allocate leave balance", 500);
  } finally {
    client.release();
  }
}