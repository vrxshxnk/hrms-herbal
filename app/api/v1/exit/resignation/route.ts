import { updateResignationApprovalSchema, createResignationSchema } from './../../../../validations/phase1_schema';
import { withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";



const getStrategies = {
  "resignation:read:self": async (userID: string) => ({
    query: `
      SELECT 
        resign.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url
      FROM resignation_requests resign 
      JOIN employees e ON resign.employee_id = e.id
      WHERE resign.employee_id = $1 
      ORDER BY resign.created_at DESC
    `,
    params: [userID],
  }),

  "resignation:read:team": async (userID: string) => ({
    query: `
      SELECT 
        resign.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url
      FROM resignation_requests resign 
      JOIN employees e ON resign.employee_id = e.id 
      WHERE e.reporting_manager_id = $1 
         OR e.super_manager_id = $1
      ORDER BY resign.created_at DESC 
    `,
    params: [userID],
  }),

  "resignation:read:all": async (userID: string) => ({
    query: `
      SELECT 
        resign.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url
      FROM resignation_requests resign
      JOIN employees e ON resign.employee_id = e.id
      ORDER BY resign.created_at DESC 
    `,
    params: [],
  }),

  "resignation:read:clearance": async (
    userID: string,
    departmentID: string,
  ) => ({
    query: `
      SELECT 
        resign.*,
        ndc.id AS clearance_id,
        ndc.department_id,
        d.name AS department_name,
        d.code AS department_code,
        ndc.status AS clearance_status,
        ndc.due_amount,
        ndc.remarks AS clearance_remarks,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email
      FROM resignation_requests resign
      JOIN employees e ON resign.employee_id = e.id
      JOIN no_dues_clearances ndc ON resign.id = ndc.resignation_id
      JOIN departments d ON ndc.department_id = d.id
      WHERE ndc.department_id = $1 AND resign.final_status = 'Clearance_In_Progress'
      ORDER BY resign.created_at DESC
    `,
    params: [departmentID],
  }),
};


const patchStrategies = {
  "resignation:approve:manager": async (
    client: any,
    requestID: string,
    actorID: string,
    body: any,
  ) => {
    const { status, remarks } = body;
    if (!["Approved", "Rejected"].includes(status)) {
      throw { status: 400, message: "Invalid status for manager approval" };
    }

    const query = `
      UPDATE resignation_requests 
      SET 
        manager_status = $1, 
        manager_remarks = $2,
        manager_reviewed_at = NOW(),
        manager_id = $4,
        final_status = CASE 
          WHEN $1 = 'Approved'::exit_stage_status THEN 'Manager_Approved'::exit_final_status
          ELSE 'Rejected'::exit_final_status
        END,
        updated_at = NOW()
      WHERE id = $3
        AND final_status = 'Submitted'
        AND employee_id IN (
          SELECT id FROM employees 
          WHERE reporting_manager_id = $4 OR super_manager_id = $4
        )
      RETURNING *;
    `;
    return client.query(query, [status, remarks || null, requestID, actorID]);
  },

 
  "resignation:approve:hr": async (
    client: any,
    requestID: string,
    actorID: string,
    body: any,
  ) => {
    const { status, remarks, officialLastWorkingDay, noticePeriodWaived } = body;
    if (!["Approved", "Rejected"].includes(status)) {
      throw { status: 400, message: "Invalid status for HR approval!" };
    }

    if (status === "Rejected") {
      const rejectQuery = `
        UPDATE resignation_requests 
        SET 
          hr_status = 'Rejected',
          hr_remarks = $1,
          hr_reviewed_at = NOW(),
          hr_id = $2,
          final_status = 'Rejected',
          updated_at = NOW()
        WHERE id = $3 AND manager_status = 'Approved'
        RETURNING *;
      `;
      return client.query(rejectQuery, [remarks || null, actorID, requestID]);
    }

  
    const updateResignationQuery = `
      UPDATE resignation_requests 
      SET 
        hr_status = 'Approved',
        hr_remarks = $1,
        hr_reviewed_at = NOW(),
        hr_id = $2,
        official_last_working_day = COALESCE($3::date, proposed_last_working_day),
        notice_period_waived = COALESCE($4, false),
        final_status = 'Clearance_In_Progress',
        updated_at = NOW()
      WHERE id = $5 AND manager_status = 'Approved'
      RETURNING *;
    `;
    const resResult = await client.query(updateResignationQuery, [
      remarks || null,
      actorID,
      officialLastWorkingDay || null,
      noticePeriodWaived,
      requestID,
    ]);

    if (resResult.rowCount === 0) {
      throw { status: 400, message: "Resignation request not ready for HR approval!" };
    }


    const createClearancesQuery = `
      INSERT INTO no_dues_clearances (resignation_id, department_id, status)
      SELECT $1, id, 'Pending'::clearance_status_enum
      FROM departments
      ON CONFLICT (resignation_id, department_id) DO NOTHING;
    `;
    await client.query(createClearancesQuery, [requestID]);

    return resResult;
  },

  "resignation:approve:clearance": async (
    client: any,
    requestID: string, 
    actorID: string,
    body: any,
  ) => {
    const { status, remarks, dueAmount, clearanceId } = body;
    if (!["Cleared", "Rejected"].includes(status)) {
      throw { status: 400, message: "Invalid status for clearance update!" };
    }

   
    const updateClearanceQuery = `
      UPDATE no_dues_clearances
      SET 
        status = $1,
        remarks = $2,
        due_amount = COALESCE($3, 0.00),
        cleared_by_id = $4,
        cleared_at = NOW(),
        updated_at = NOW()
      WHERE id = $5 
        AND department_id = (SELECT department_id FROM employees WHERE id = $4)
      RETURNING *;
    `;

    const clearanceResult = await client.query(updateClearanceQuery, [
      status,
      remarks || null,
      dueAmount || 0.00,
      actorID,
      clearanceId || requestID,
    ]);

    if (clearanceResult.rowCount === 0) {
      throw {
        status: 403,
        message: "Unauthorized or clearance record not found for your department!",
      };
    }

    const updatedClearance = clearanceResult.rows[0];

    const checkCompletionQuery = `
      SELECT 
        COUNT(*) AS total_count,
        COUNT(CASE WHEN status = 'Cleared' THEN 1 END) AS cleared_count
      FROM no_dues_clearances
      WHERE resignation_id = $1;
    `;
    const checkResult = await client.query(checkCompletionQuery, [
      updatedClearance.resignation_id,
    ]);

    const { total_count, cleared_count } = checkResult.rows[0];

    // If all department clearances are cleared, set final_status to 'Completed'
    if (parseInt(total_count) > 0 && parseInt(total_count) === parseInt(cleared_count)) {
      await client.query(
        `UPDATE resignation_requests 
         SET final_status = 'Completed', updated_at = NOW() 
         WHERE id = $1`,
        [updatedClearance.resignation_id]
      );
    }

    return clearanceResult;
  },
};



export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError("UNAUTHORIZED", "Unauthorized, please try again!", 401);
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "self"; // Options: 'self', 'team', 'all', 'clearance'
    const roles = authUser.roles || [];
    console.log("roels h exit empl k",roles);
    return await withTranscations(async (client) => {
      // 1. Resolve logged-in employee ID and department
      const empRes = await client.query(
        `SELECT id, department_id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authUser.sub],
      );

      if (empRes.rowCount === 0) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }

      const { id: actorId, department_id: departmentId } = empRes.rows[0];

      // 2. Map requested scope to appropriate GET strategy with role checks
      let strategyKey: keyof typeof getStrategies = "resignation:read:self"
       if (
        (roles.includes("manager") ||
          roles.includes("super_manager") ||
          roles.includes("admin"))
      ) {
        strategyKey = "resignation:read:team";
      } else if (
        (roles.includes("hr") ||
          roles.includes("hr_admin") ||
          roles.includes("admin"))
      ) {
        strategyKey = "resignation:read:all";
      } else if (
        roles.includes("department_lead")
      ) {
        strategyKey = "resignation:read:clearance";
      }

      if (!strategyKey) {
        return apiError(
          "FORBIDDEN",
          `You do not have permission to view resignations under scope '${scope}'`,
          403,
        );
      }

      // 3. Resolve query configuration using strategy
      let config;
      if (strategyKey === "resignation:read:clearance") {
        if (!departmentId) {
          return apiError(
            "BAD_REQUEST",
            "Employee department missing for clearance lookup",
            400,
          );
        }
        config = await getStrategies[strategyKey](actorId, departmentId);
      } else {
        config = await getStrategies[strategyKey](actorId);
      }

      // 4. Fetch data
      const result = await client.query(config.query, config.params);

      return ok({
        data: result.rows,
        total: result.rowCount,
        success: true,
      });
    });
  } catch (error: any) {
    console.error("Error fetching resignation requests:", error);

    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return apiError("NOT_FOUND", "Employee profile not found", 404);
    }

    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to retrieve resignation records",
      500,
    );
  }
}


export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError("UNAUTHORIZED", "Unauthorized, please try again!", 401);
    }

    const parsed = await parseJson(request, createResignationSchema);
    if (parsed.error) return parsed.error;
    const { reason, proposed_last_working_day, comments , notice_period_days} = parsed.data;
    const newResignation = await withTranscations(async (client) => {
      const empRes = await client.query(
        `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authUser.sub],
      );

      if (empRes.rowCount === 0) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }

      const noticePeriodDays= notice_period_days
      const { id: employeeId,   } =
        empRes.rows[0];

      // 2. Prevent duplicate active resignation applications
      const activeCheck = await client.query(
        `SELECT id FROM resignation_requests 
         WHERE employee_id = $1 AND final_status NOT IN ('Rejected',  'Completed') 
         LIMIT 1`,
        [employeeId],
      );

      if (activeCheck?.rows.length > 0) {
        throw new Error("ACTIVE_RESIGNATION_EXISTS");
      }

      // 3. Insert resignation request
      const insertQuery = `
        INSERT INTO resignation_requests (
          employee_id,
          reason,
          proposed_last_working_day,
          notice_period_days,
          comments,
          manager_status,
          hr_status,
          final_status,
          created_at,
          updated_at
        ) VALUES (
          $1, $2, $3, COALESCE($4, 30), $5,
          'Pending'::exit_stage_status,
          'Pending'::exit_stage_status,
          'Submitted'::exit_final_status,
          NOW(),
          NOW()
        )
        RETURNING *;
      `;

      const result = await client.query(insertQuery, [
        employeeId,
        reason,
        proposed_last_working_day,
        noticePeriodDays || 30,
        comments || null,
      ]);

      return result.rows[0];
    });

    return ok({
      data: newResignation,
      success: true,
      message: "Resignation request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error creating resignation request:", error);

    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return apiError("NOT_FOUND", "Employee profile not found", 404);
    }
    if (error.message === "ACTIVE_RESIGNATION_EXISTS") {
      return apiError(
        "CONFLICT",
        "An active resignation request already exists for this employee",
        409,
      );
    }

    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to process resignation request",
      500,
    );
  }
}


export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError("UNAUTHORIZED", "Unauthorized, please try again!", 401);
    }

    const parsed = await parseJson(request, updateResignationApprovalSchema);
    if (parsed.error) return parsed.error;

    const {
      requestId,
      status,
      remarks,
      stage,
      officialLastWorkingDay,
      noticePeriodWaived,
      dueAmount,
      clearanceId,
    } = parsed.data;

    const roles = authUser.roles || [];

    // Map role and explicit request stage to strategy
    let strategyKey: keyof typeof patchStrategies | null = null;

    if (
      stage === "manager" &&
      (roles.includes("manager") ||
        roles.includes("super_manager") ||
        roles.includes("admin"))
    ) {
      strategyKey = "resignation:approve:manager";
    } else if (
      stage === "hr" &&
      (roles.includes("hr") ||
        roles.includes("hr_admin") ||
        roles.includes("admin"))
    ) {
      strategyKey = "resignation:approve:hr";
    } else if (
      stage === "clearance" ||
      stage === "department_lead"
    ) {
      strategyKey = "resignation:approve:clearance";
    }

    if (!strategyKey) {
      return apiError(
        "FORBIDDEN",
        "You do not have permission to execute this approval stage",
        403,
      );
    }

    const updatedRecord = await withTranscations(async (client) => {
      // 1. Resolve employee actor ID
      const empRes = await client.query(
        `SELECT id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authUser.sub],
      );

      if (empRes.rowCount === 0) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }

      const actorId = empRes.rows[0].id;
      const strategy = patchStrategies[strategyKey!];

      // 2. Execute update strategy
      const result = await strategy(client, requestId, actorId, {
        status,
        remarks,
        officialLastWorkingDay,
        noticePeriodWaived,
        dueAmount,
        clearanceId,
      });

      if (result.rowCount === 0) {
        throw new Error("PREREQUISITE_NOT_MET_OR_NOT_FOUND");
      }

      return result.rows[0];
    });

    return ok({
      data: updatedRecord,
      success: true,
      message: `Resignation stage '${stage}' processed successfully as ${status}`,
    });
  } catch (error: any) {
    console.error("Error updating resignation approval:", error);

    if (error.status && error.message) {
      return apiError("BAD_REQUEST", error.message, error.status);
    }
    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return apiError("NOT_FOUND", "Approver employee record not found", 404);
    }
    if (error.message === "PREREQUISITE_NOT_MET_OR_NOT_FOUND") {
      return apiError(
        "BAD_REQUEST",
        "Unable to update approval state. Verify that previous stages are approved and you have direct reporting authority.",
        400,
      );
    }

    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to update resignation request",
      500,
    );
  }
}