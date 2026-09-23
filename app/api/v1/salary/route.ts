import { apiError, ok } from "@/app/lib/api/response";
import { getPool, withTranscations } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { parseJson } from "@/app/lib/api/validation";
import { advanceSalarySchema } from "@/app/validations/phase1_schema";


// 1. Define Strategy Map for Salary Requests
const salaryStrategies = {
  // HR / Admin / Finance: Read all organization requests
  "salary:read:all": (_userId: string) => ({
    query: `
      SELECT 
        asr.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url
      FROM advance_salary_requests asr
      JOIN employees e ON asr.employee_id = e.id
      ORDER BY asr.created_at DESC
    `,
    params: [],
  }),

  // Manager / Super Manager: Read direct reports' + super-report requests
  "salary:read:team": (userId: string) => ({
    query: `
      SELECT 
        asr.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url
      FROM advance_salary_requests asr
      JOIN employees e ON asr.employee_id = e.id
      WHERE e.reporting_manager_id = $1 OR e.super_manager_id = $1 OR asr.employee_id = $1
      ORDER BY asr.created_at DESC
    `,
    params: [userId],
  }),

  // Employee: Read self requests only
  "salary:read:self": (userId: string) => ({
    query: `
      SELECT 
        asr.*,
        e.employee_code,
        e.first_name,
        e.last_name
      FROM advance_salary_requests asr
      JOIN employees e ON asr.employee_id = e.id
      WHERE asr.employee_id = $1
      ORDER BY asr.created_at DESC
    `,
    params: [userId],
  }),
};

// 1. Define Approval Strategies for each role
const patchStrategies = {
  // MANAGER APPROVAL STRATEGY
  "salary:approve:manager": async (client: any, requestId: string, actorId: string, body: any) => {
    const { status, remarks } = body; // 'APPROVED' | 'REJECTED'
    const upperStatus= status?.toUpperCase(); 
    if (!["APPROVED", "REJECTED"].includes(upperStatus)) {
      throw { status: 400, message: "Invalid status for Manager approval" };
    }

    const nextStatus = upperStatus === "REJECTED" ? "Rejected" :"Pending";
    const query = `
      UPDATE advance_salary_requests
      SET 
        manager_status = $1,
        manager_remarks = $2,
        manager_approved_at = NOW(),
        status= $5,
        updated_at = NOW()
      WHERE id = $3 
        AND (
          employee_id IN (SELECT id FROM employees WHERE reporting_manager_id = $4 OR super_manager_id = $4)
        )
      RETURNING *;
    `;
    return client.query(query, [status, remarks, requestId, actorId,nextStatus]);
  },

  // HR APPROVAL STRATEGY
  "salary:approve:hr": async (client: any, requestId: string, _actorId: string, body: any) => {
    const { status, remarks } = body;
    const upperStatus= status?.toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(upperStatus)) {
      throw { status: 400, message: "Invalid status for HR approval" };
    }
    const nextStatus = upperStatus === "REJECTED" ? "Rejected" :"Pending";
    const query = `
      UPDATE advance_salary_requests
      SET 
        hr_status = $1,
        hr_remarks = $2,
        hr_approved_at = NOW(),
        status=$4,
        updated_at = NOW()
      WHERE id = $3 AND manager_status = 'Approved'
      RETURNING *;
    `;
    return client.query(query, [status, remarks, requestId, nextStatus]);
  },

  // FINANCE DISBURSEMENT STRATEGY
  "salary:approve:finance": async (client: any, requestId: string, _actorId: string, body: any) => {
    const { status, remarks, disbursementTxnId } = body;
    const upperStatus = status?.toUpperCase();
    if (!["DISBURSED", "REJECTED"].includes(upperStatus)) {
      throw { status: 400, message: "Invalid status for Finance processing" };
    }
     const nextStatus = upperStatus === "REJECTED" ? "Rejected" :"Approved";
    const query = `
      UPDATE advance_salary_requests
      SET 
        finance_status = $1,
        finance_remarks = $2,
        transaction_reference = $3,
        disbursed_at = NOW(),
        status=$5,
        updated_at = NOW()
      WHERE id = $4 AND hr_status = 'Approved'
      RETURNING *;
    `;
    return client.query(query, [status, remarks, disbursementTxnId, requestId, nextStatus]);
  },
};

// 2. PATCH Endpoint Handler
export async function PATCH(request: Request) {
  const pool = await getPool();
  const client = await pool.connect();

  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = await request.json();
    const { requestId, actionRole } = body; // actionRole: 'manager' | 'hr' | 'finance'

    if (!requestId) {
      return apiError("BAD_REQUEST", "Request ID is required", 400);
    }

    // Resolve Employee ID from Auth
    const empRes = await client.query(
      `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
      [authUser.sub]
    );
    if (empRes.rowCount === 0) {
      return apiError("NOT_FOUND", "Employee record not found", 404);
    }
    const actorId = empRes.rows[0].id;
    const roles = authUser.roles || [];

    // Map requested role action to Strategy
    let strategyKey: keyof typeof patchStrategies | null = null;

    if (actionRole === "finance" && (roles.includes("finance") || roles.includes("admin"))) {
      strategyKey = "salary:approve:finance";
    } else if (actionRole === "hr" && (roles.includes("hr") || roles.includes("admin"))) {
      strategyKey = "salary:approve:hr";
    } else if (actionRole === "manager" && (roles.includes("manager") || roles.includes("super_manager"))) {
      strategyKey = "salary:approve:manager";
    }

    if (!strategyKey) {
      return apiError("FORBIDDEN", "You do not have permission to perform this update action", 403);
    }

    await client.query("BEGIN");
    const strategy = patchStrategies[strategyKey];
    const result = await strategy(client, requestId, actorId, body);

    if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return apiError("CONFLICT","Unable to update request. Either record was not found or prerequisites were not met (e.g., prior approval required).",409);
    }
    await client.query("COMMIT");
    return ok({
      message: "Request updated successfully",
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error updating salary request:", error);
    if (error.status && error.message) {
      return apiError("BAD_REQUEST", error.message, error.status);
    }
    return apiError("INTERNAL_ERROR", "Failed to update salary request", 500);
  } finally {
    client.release();
  }
}



// 2. GET API Handler using Strategy Pattern
export async function GET(request: Request) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const authuser = await getAuthenticatedUser(request);
    if (!authuser || !authuser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication required", 401);
    }

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
    let strategyKey: keyof typeof salaryStrategies = "salary:read:self";

    if (roles.includes("hr") || roles.includes("hr_admin") || roles.includes("finance") || roles.includes("admin")) {
      strategyKey = "salary:read:all";
    } else if (roles.includes("manager") || roles.includes("super_manager")) {
      strategyKey = "salary:read:team";
    }

    const strategy = salaryStrategies[strategyKey];
    const { query, params } = strategy(employeeId);

    const result = await client.query(query, params);

    return ok({
      strategy: strategyKey,
      data: result.rows,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching salary requests:", error);
    return apiError("INTERNAL_ERROR", "Failed to fetch salary requests", 500);
  } finally {
    client.release();
  }
}


export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser?.sub) {
      return apiError("UNAUTHORIZED", "Authentication Failed, please try again!", 401);
    }

    const parsed = await parseJson(request, advanceSalarySchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

    const advanceSalaryReq = await withTranscations(async (client) => {
      const empRes = await client.query(
        `SELECT id, status FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authUser.sub]
      );

      if (empRes.rows.length === 0) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }
      const employee = empRes.rows[0];
      if (employee.status !== "active") {
        throw new Error("EMPLOYEE_INACTIVE");
      }

      const existingReq = await client.query(
        `SELECT id FROM advance_salary_requests 
         WHERE employee_id = $1 AND status IN ('Pending', 'In_Review') LIMIT 1`,
        [employee.id]
      );

      if (existingReq.rows.length > 0) {
        throw new Error("PENDING_REQUEST_EXISTS");
      }

      const insertQuery = `
        INSERT INTO advance_salary_requests (
          employee_id,
          request_type,
          amount_requested,
          tenure_months,
          reason,
          status,
          manager_status,
          hr_status,
          finance_status
        )
        VALUES ($1, $2, $3, $4, $5, 'Pending', 'Pending', 'Pending', 'Pending')
        RETURNING *;
      `;

      const values = [
        employee.id,       
        data.requestType,   
        data.amountRequested, 
        data.tenureMonths, 
        data.reason,        
      ];

      const res = await client.query(insertQuery, values);
      return res.rows[0];
    });

    return ok({ data: advanceSalaryReq, success: true });

  } catch (error: any) {
    console.error("Error while creating salary request:", error);

    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return apiError("NOT_FOUND", "Employee record not found", 404);
    }

    if (error.message === "EMPLOYEE_INACTIVE") {
      return apiError("FORBIDDEN", "Only active employees can request advance salary", 403);
    }

    if (error.message === "PENDING_REQUEST_EXISTS") {
      return apiError("CONFLICT", "You already have a pending salary request under review", 409);
    }

    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to submit salary request",
      500
    );
  }
}



