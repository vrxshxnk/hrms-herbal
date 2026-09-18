import { apiError, ok } from "@/app/lib/api/response";
import { withTranscations } from "@/app/lib/api/client"; 
import { getAuthenticatedUser } from "@/app/lib/auth/auth";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await request.json();
    const leaveId = params?.id || body.id;

    // 1. Auth & Role Validation
    const authuser = await getAuthenticatedUser(request);
    const isHR = authuser.roles.includes("hr");
    const isManager = authuser.roles.includes("manager");

    if (!isHR && !isManager) {
      return apiError(
        "FORBIDDEN",
        "Only Managers or HR can approve/reject leaves.",
        403
      );
    }

    // 2. Normalize Payload Action
    const rawAction = body.action || body.status;
    const computedAction = rawAction?.toLowerCase().includes("reject")
      ? "reject"
      : rawAction?.toLowerCase().includes("appr")
      ? "approve"
      : null;

    if (!leaveId || !["approve", "reject"].includes(computedAction!)) {
      return apiError(
        "BAD_REQUEST",
        "Invalid payload: 'id' and valid 'action' ('approve' or 'reject') are required!",
        400
      );
    }

    if (computedAction === "reject" && !body.rejection_reason) {
      return apiError(
        "BAD_REQUEST",
        "A rejection reason is required when rejecting!",
        400
      );
    }

    // 3. Execute DB logic inside transaction
    const resultData = await withTranscations(async (client) => {
      // Fetch Approver Employee UUID & Keycloak info
      const empRes = await client.query(
        `SELECT id, reporting_manager_id FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authuser.sub]
      );

      if (empRes.rowCount === 0) {
        throw { 
          code: "NOT_FOUND", 
          message: "Approver employee record not found in database.", 
          status: 404 
        };
      }

      const approverEmployeeId = empRes.rows[0].id;

      // Fetch Target Leave Request Details & Employee's assigned Manager
      const leaveRes = await client.query(
        `SELECT 
            lr.employee_id, 
            lr.leave_type_id, 
            lr.total_days, 
            lr.start_date, 
            lr.status, 
            lr.manager_approval_status,
            e.reporting_manager_id
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         WHERE lr.id = $1 FOR UPDATE`,
        [leaveId]
      );

      if (leaveRes.rowCount === 0) {
        throw { 
          code: "NOT_FOUND", 
          message: "Leave request record not found.", 
          status: 404 
        };
      }

      const leaveRequest = leaveRes.rows[0];
      const { 
        employee_id, 
        leave_type_id, 
        total_days, 
        start_date, 
        status: currentStatus, 
        manager_approval_status,
        reporting_manager_id 
      } = leaveRequest;

      const reqYear = new Date(start_date).getFullYear();

      // IF USER IS MANAGER (and NOT HR) OR HR is acting as Manager
      if (isManager && !isHR) {
        const mgrStatus = computedAction === "reject" ? "Rejected" : "Approved";
        
        // Added explicit $1::varchar cast to prevent 42P08 PostgreSQL type ambiguity
        const updateRes = await client.query(
          `UPDATE leave_requests
           SET 
             manager_approval_status = $1::varchar,
             manager_approved_by = $2,
             manager_action_at = CURRENT_TIMESTAMP,
             rejection_reason = $3,
             status = CASE WHEN $1::varchar = 'Rejected' THEN 'Rejected' ELSE status END,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING *;`,
          [mgrStatus, approverEmployeeId, computedAction === "reject" ? body.rejection_reason : null, leaveId]
        );

        return {
          newStatus: mgrStatus,
          updatedRecord: updateRes.rows[0]
        };
      }

      // IF USER IS HR (Final Approval Gate)
      if (isHR) {
        // Enforce Workflow Rule: If employee has a manager assigned, manager MUST approve first!
        const requiresManager = Boolean(reporting_manager_id);
        
        if (computedAction === "approve" && requiresManager && manager_approval_status !== "Approved") {
          throw {
            code: "BAD_REQUEST",
            message: "Cannot approve leave: Waiting for manager approval first.",
            status: 400
          };
        }

        const newStatus = computedAction === "reject" ? "Rejected" : "Approved";

        // Deduct balance on HR final approval
        if (computedAction === "approve" && currentStatus !== "Approved") {
          let balRes = await client.query(
            `SELECT total_leaves_avail, used_leaves 
             FROM employee_leave_balances 
             WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 FOR UPDATE`,
            [employee_id, leave_type_id, reqYear]
          );

          if (balRes.rowCount === 0) {
            balRes = await client.query(
              `INSERT INTO employee_leave_balances 
                 (employee_id, leave_type_id, year, total_leaves_avail, monthly_limit, used_leaves)
               VALUES 
                 ($1, $2, $3, 15.0, 1.5, 0.0)
               ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
               RETURNING total_leaves_avail, used_leaves`,
              [employee_id, leave_type_id, reqYear]
            );
          }

          const { total_leaves_avail, used_leaves } = balRes.rows[0];
          const remainingBalance = Number(total_leaves_avail) - Number(used_leaves);

          if (Number(total_days) > remainingBalance) {
            throw {
              code: "BAD_REQUEST",
              message: `Insufficient leave balance. Available: ${remainingBalance} days, Requested: ${total_days} days.`,
              status: 400
            };
          }

          await client.query(
            `UPDATE employee_leave_balances 
             SET used_leaves = used_leaves + $1, updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [total_days, employee_id, leave_type_id, reqYear]
          );
        } 
        // Restore balance if HR rejects previously approved leave
        else if (computedAction === "reject" && currentStatus === "Approved") {
          await client.query(
            `UPDATE employee_leave_balances 
             SET used_leaves = GREATEST(0, used_leaves - $1), updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [total_days, employee_id, leave_type_id, reqYear]
          );
        }

        const updateRes = await client.query(
          `UPDATE leave_requests
           SET 
             status = $1,
             approved_by = $2,
             rejection_reason = $3,
             action_taken_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $4
           RETURNING *;`,
          [newStatus, approverEmployeeId, computedAction === "reject" ? body.rejection_reason : null, leaveId]
        );

        return {
          newStatus,
          updatedRecord: updateRes.rows[0]
        };
      }

      throw { code: "FORBIDDEN", message: "Unauthorized action.", status: 403 };
    });

    return ok({
      message: `Leave request status updated to '${resultData.newStatus}'`,
      data: resultData.updatedRecord,
    });

  } catch (error: any) {
    console.error("Error updating leave request status:", error);
    if (error?.code && error?.message) {
      return apiError(error.code, error.message, error.status || 400);
    }
    return apiError("INTERNAL_ERROR", "Failed to update leave request status", 500);
  }
}