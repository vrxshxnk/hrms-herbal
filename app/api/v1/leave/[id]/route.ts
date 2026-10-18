import { apiError, ok } from "@/app/lib/api/response";
import { withTranscations } from "@/app/lib/api/client";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { createNotification } from "@/app/lib/api/notifications";
import { hasAdminRole, hasHRRole, hasManagerRole } from "@/app/lib/auth/roles";
import { z } from "zod";
import { isWorkflowError } from "@/app/lib/api/errors";

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const params = await props.params;
    const payload = z.object({
      id: z.string().optional(),
      action: z.string().optional(),
      status: z.string().optional(),
      rejection_reason: z.string().nullable().optional(),
    }).safeParse(await request.json().catch(() => null));
    if (!payload.success) {
      return apiError("BAD_REQUEST", "A valid leave action payload is required.", 400);
    }
    const body = payload.data;
    const leaveId = params?.id || body.id;

    // 1. Auth & Role Extraction
    const authuser = await getAuthenticatedUser(request);
    const isHR = hasHRRole(authuser.roles);
    const isManager = hasManagerRole(authuser.roles);
    if (!z.uuid().safeParse(leaveId).success) {
      return apiError("BAD_REQUEST", "A valid leave request ID is required.", 400);
    }

    // 2. Normalize Payload Action
    const rawAction = body.action || body.status;
    const normalizedAction = typeof rawAction === "string" ? rawAction.toLowerCase() : "";
    const computedAction = ["withdraw", "withdrawn"].includes(normalizedAction)
      ? "withdraw"
      : ["reject", "rejected"].includes(normalizedAction)
        ? "reject"
        : ["approve", "approved"].includes(normalizedAction)
          ? "approve"
          : null;

    if (
      !leaveId ||
      !["approve", "reject", "withdraw"].includes(computedAction!)
    ) {
      return apiError(
        "BAD_REQUEST",
        "Invalid payload: 'id' and valid 'action' ('approve', 'reject', or 'withdraw') are required!",
        400,
      );
    }

    if (computedAction === "reject" && (typeof body.rejection_reason !== "string" || !body.rejection_reason.trim())) {
      return apiError(
        "BAD_REQUEST",
        "A rejection reason is required when rejecting!",
        400,
      );
    }


    if (
      ["approve", "reject"].includes(computedAction!) &&
      !isHR &&
      !isManager
    ) {
      return apiError(
        "FORBIDDEN",
        "Only Managers or HR can approve/reject leaves.",
        403,
      );
    }

    // 3. Execute DB logic inside transaction
    const resultData = await withTranscations(async (client) => {
      // Fetch Actor's Employee record & Keycloak ID mapping
      const empRes = await client.query(
        `SELECT id, keycloak_id, reporting_manager_id, COALESCE(display_name, CONCAT(first_name, ' ', last_name)) AS name FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authuser.sub],
      );

      if (empRes.rowCount === 0) {
        throw {
          code: "NOT_FOUND",
          message: "Employee record not found in database.",
          status: 404,
        };
      }

      const actorEmployee = empRes.rows[0];

      // Fetch Target Leave Request Details & Employee's assigned Manager
      const leaveRes = await client.query(
        `SELECT 
            lr.id,
            lr.employee_id, 
            lr.leave_type_id, 
            lr.total_days, 
            lr.start_date, 
            lr.status, 
            lr.manager_approval_status,
            e.reporting_manager_id,
            e.super_manager_id,
            e.keycloak_id AS owner_keycloak_id,
            lt.name AS leave_type_name
         FROM leave_requests lr
         JOIN employees e ON lr.employee_id = e.id
         JOIN leave_types lt ON lr.leave_type_id = lt.id
         WHERE lr.id = $1 FOR UPDATE`,
        [leaveId],
      );

      if (leaveRes.rowCount === 0) {
        throw {
          code: "NOT_FOUND",
          message: "Leave request record not found.",
          status: 404,
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
        reporting_manager_id,
        owner_keycloak_id,
        leave_type_name,
      } = leaveRequest;

      const reqYear = new Date(start_date).getFullYear();

      // ==========================================
      // ACTION 1: WITHDRAW LEAVE REQUEST
      // ==========================================
      if (computedAction === "withdraw") {
        const isOwner = owner_keycloak_id === authuser.sub;
        if (!isOwner && !isHR) {
          throw {
            code: "FORBIDDEN",
            message: "You can only withdraw your own leave requests.",
            status: 403,
          };
        }

        if (currentStatus === "Withdrawn" || currentStatus === "Rejected") {
          throw {
            code: "BAD_REQUEST",
            message: "This leave request is already closed.",
            status: 400,
          };
        }

        if (currentStatus === "Approved") {
          await client.query(
            `UPDATE employee_leave_balances 
             SET used_leaves = GREATEST(0, used_leaves - $1), updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [total_days, employee_id, leave_type_id, reqYear],
          );
        }

        const updateRes = await client.query(
          `UPDATE leave_requests
           SET 
             status = 'Withdrawn',
             manager_approval_status = 'Withdrawn',
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1
           RETURNING *;`,
          [leaveId],
        );

        // Notify Reporting Manager if withdrawn
        if (reporting_manager_id) {
          await createNotification(client, {
            recipientId: reporting_manager_id,
            title: "Leave Request Withdrawn",
            message: `${actorEmployee.name} has withdrawn their ${leave_type_name} request for ${total_days} day(s).`,
            type: "leave_withdrawn",
            referenceId: leaveId,
            referenceType: "leave_requests",
          });
        }

        return {
          newStatus: "Withdrawn",
          updatedRecord: updateRes.rows[0],
        };
      }

      // ==========================================
      // ACTION 2: MANAGER APPROVAL / REJECTION
      // ==========================================
      if (owner_keycloak_id === authuser.sub && !hasAdminRole(authuser.roles)) {
        throw { code: "FORBIDDEN", message: "You cannot approve or reject your own leave request.", status: 403 };
      }
      if (currentStatus === "Withdrawn" || currentStatus === "Rejected") {
        throw { code: "CONFLICT", message: "This leave request is already closed. Submit a new request instead.", status: 409 };
      }
      if (isManager && !isHR) {
        if (reporting_manager_id !== actorEmployee.id && leaveRequest.super_manager_id !== actorEmployee.id) {
          throw { code: "FORBIDDEN", message: "You can only review leave requests for your assigned team.", status: 403 };
        }
        if (currentStatus !== "Pending" || manager_approval_status !== "Pending") {
          throw { code: "CONFLICT", message: "This request has already been reviewed.", status: 409 };
        }
        const mgrStatus = computedAction === "reject" ? "Rejected" : "Approved";

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
          [
            mgrStatus,
            actorEmployee.id,
            computedAction === "reject" ? body.rejection_reason : null,
            leaveId,
          ],
        );

        // Notify requesting employee
        await createNotification(client, {
          recipientId: employee_id,
          title: `Leave Request Manager ${mgrStatus}`,
          message:
            computedAction === "reject"
              ? `Your manager ${actorEmployee.name} rejected your leave request (${leave_type_name}). Reason: ${body.rejection_reason}`
              : `Your manager ${actorEmployee.name} approved your leave request (${leave_type_name}). Pending HR approval.`,
          type: computedAction === "reject" ? "leave_rejected" : "leave_manager_approved",
          referenceId: leaveId,
          referenceType: "leave_requests",
        });

        return {
          newStatus: mgrStatus,
          updatedRecord: updateRes.rows[0],
        };
      }

      // ==========================================
      // ACTION 3: HR FINAL APPROVAL / REJECTION
      // ==========================================
      if (isHR) {
        const requiresManager = Boolean(reporting_manager_id);

        if (
          computedAction === "approve" &&
          requiresManager &&
          manager_approval_status !== "Approved"
        ) {
          throw {
            code: "BAD_REQUEST",
            message:
              "Cannot approve leave: Waiting for manager approval first.",
            status: 400,
          };
        }

        const newStatus = computedAction === "reject" ? "Rejected" : "Approved";

        if (computedAction === "approve" && currentStatus !== "Approved") {
          let balRes = await client.query(
            `SELECT total_leaves_avail, used_leaves 
             FROM employee_leave_balances 
             WHERE employee_id = $1 AND leave_type_id = $2 AND year = $3 FOR UPDATE`,
            [employee_id, leave_type_id, reqYear],
          );

          if (balRes.rowCount === 0) {
            balRes = await client.query(
              `INSERT INTO employee_leave_balances 
                 (employee_id, leave_type_id, year, total_leaves_avail, monthly_limit, used_leaves)
               VALUES 
                 ($1, $2, $3, 15.0, 1.5, 0.0)
               ON CONFLICT (employee_id, leave_type_id, year) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
               RETURNING total_leaves_avail, used_leaves`,
              [employee_id, leave_type_id, reqYear],
            );
          }

          const { total_leaves_avail, used_leaves } = balRes.rows[0];
          const remainingBalance =
            Number(total_leaves_avail) - Number(used_leaves);

          if (Number(total_days) > remainingBalance) {
            throw {
              code: "BAD_REQUEST",
              message: `Insufficient leave balance. Available: ${remainingBalance} days, Requested: ${total_days} days.`,
              status: 400,
            };
          }

          await client.query(
            `UPDATE employee_leave_balances 
             SET used_leaves = used_leaves + $1, updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [total_days, employee_id, leave_type_id, reqYear],
          );
        } else if (
          computedAction === "reject" &&
          currentStatus === "Approved"
        ) {
          await client.query(
            `UPDATE employee_leave_balances 
             SET used_leaves = GREATEST(0, used_leaves - $1), updated_at = CURRENT_TIMESTAMP
             WHERE employee_id = $2 AND leave_type_id = $3 AND year = $4`,
            [total_days, employee_id, leave_type_id, reqYear],
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
          [
            newStatus,
            actorEmployee.id,
            computedAction === "reject" ? body.rejection_reason : null,
            leaveId,
          ],
        );

        // Notify requesting employee of final HR status
        await createNotification(client, {
          recipientId: employee_id,
          title: `Leave Request ${newStatus}`,
          message:
            computedAction === "reject"
              ? `Your leave request for ${leave_type_name} was rejected by HR. Reason: ${body.rejection_reason}`
              : `Your leave request for ${leave_type_name} (${total_days} days) starting ${start_date} has been fully approved.`,
          type: computedAction === "reject" ? "leave_rejected" : "leave_approved",
          referenceId: leaveId,
          referenceType: "leave_requests",
        });

        return {
          newStatus,
          updatedRecord: updateRes.rows[0],
        };
      }

      throw { code: "FORBIDDEN", message: "Unauthorized action.", status: 403 };
    });

    return ok({
      message: `Leave request status updated to '${resultData.newStatus}'`,
      data: resultData.updatedRecord,
    });
  } catch (error: unknown) {
    console.error("Error updating leave request status:", error);
    if (isWorkflowError(error)) {
      return apiError(error.code, error.message, error.status || 400);
    }
    return apiError(
      "INTERNAL_ERROR",
      "Failed to update leave request status",
      500,
    );
  }
}
