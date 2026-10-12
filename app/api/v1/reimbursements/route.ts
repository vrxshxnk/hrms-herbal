import { getPool, withTranscations } from "@/app/lib/api/client";
import { createNotification } from "@/app/lib/api/notifications";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import {createReimbursementSchema,updateReimbursementApprovalSchema} from "@/app/validations/phase1_schema";

const getStrategies = {
  "reimbursements:read-all": (_userID: string) => ({
    query: `
      SELECT 
        re.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'category', ri.category,
              'expenseDate', ri.expense_date,
              'amount', ri.amount,
              'merchantName', ri.merchant_name,
              'description', ri.description,
              'receiptUrl', ri.receipt_url,
              'fileMimeType', ri.file_mime_type
            )
          ) FILTER (WHERE ri.id IS NOT NULL), '[]'
        ) AS items
      FROM reimbursement_requests re
      JOIN employees e ON re.employee_id = e.id
      LEFT JOIN reimbursement_items ri ON ri.reimbursement_request_id = re.id
      GROUP BY re.id, e.id
      ORDER BY re.created_at DESC
    `,
    params: [],
  }),

  "reimbursements:read-team": (userID: string) => ({
    query: `
      SELECT 
        re.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'category', ri.category,
              'expenseDate', ri.expense_date,
              'amount', ri.amount,
              'merchantName', ri.merchant_name,
              'description', ri.description,
              'receiptUrl', ri.receipt_url,
              'fileMimeType', ri.file_mime_type
            )
          ) FILTER (WHERE ri.id IS NOT NULL), '[]'
        ) AS items
      FROM reimbursement_requests re
      JOIN employees e ON re.employee_id = e.id
      LEFT JOIN reimbursement_items ri ON ri.reimbursement_request_id = re.id
      WHERE e.reporting_manager_id = $1 
         OR e.super_manager_id = $1 
         OR re.employee_id = $1
      GROUP BY re.id, e.id
      ORDER BY re.created_at DESC
    `,
    params: [userID],
  }),

  "reimbursements:read-self": (userID: string) => ({
    query: `
      SELECT 
        re.*,
        e.employee_code,
        e.first_name,
        e.last_name,
        e.work_email,
        e.profile_photo_url,
        COALESCE(
          json_agg(
            json_build_object(
              'id', ri.id,
              'category', ri.category,
              'expenseDate', ri.expense_date,
              'amount', ri.amount,
              'merchantName', ri.merchant_name,
              'description', ri.description,
              'receiptUrl', ri.receipt_url,
              'fileMimeType', ri.file_mime_type
            )
          ) FILTER (WHERE ri.id IS NOT NULL), '[]'
        ) AS items
      FROM reimbursement_requests re
      JOIN employees e ON re.employee_id = e.id
      LEFT JOIN reimbursement_items ri ON ri.reimbursement_request_id = re.id
      WHERE re.employee_id = $1
      GROUP BY re.id, e.id
      ORDER BY re.created_at DESC
    `,
    params: [userID],
  }),
};

const patchStrategies = {
  "reimburse:approve:manager": async (
    client: any,
    requestID: string,
    actorID: string,
    body: any,
  ) => {
    const { status, remarks } = body;
    if (!["Approved", "Rejected"].includes(status)) {
      throw { status: 400, message: "Invalid status for manager approval" };
    }

    const nextStatus = status === "Rejected" ? "Rejected" : "Pending";
    const query = `
      UPDATE reimbursement_requests 
      SET 
        manager_status = $1, 
        manager_remarks = $2,
        manager_approved_at = NOW(),
        status = $5,
        updated_at = NOW()
      WHERE id = $3
        AND (
          employee_id IN (
            SELECT id FROM employees 
            WHERE reporting_manager_id = $4 OR super_manager_id = $4
          )
        )
      RETURNING *; 
    `;
    const res= await client.query(query, [
      status,
      remarks || null,
      requestID,
      actorID,
      nextStatus,
    ]);
    const updatedRecord= res.rows[0];
    if(updatedRecord){
      await createNotification(client, {
        recipientId: updatedRecord.employee_id,
        title: `Reimbursement Manager ${status}`,
        message:
          status === "Rejected"
            ? `Your reimbursement request was rejected by your manager. Remarks: ${remarks || "None"}`
            : `Your reimbursement request for ₹${updatedRecord.total_amount} was approved by manager. Pending HR approval.`,
        type: status === "Rejected" ? "reimbursement_manager_rejected" : "reimbursement_manager_approved",
        referenceId: requestID,
        referenceType: "reimbursement_requests",
      });
    }
    return res; 
  },

  "reimburse:approve:hr": async (
    client: any,
    requestID: string,
    actorID: string,
    body: any,
  ) => {
    const { status, remarks } = body;
    if (!["Approved", "Rejected"].includes(status)) {
      throw { status: 400, message: "Invalid status for HR approval!" };
    }

    const nextStatus = status === "Rejected" ? "Rejected" : "Pending";
    const query = `
      UPDATE reimbursement_requests 
      SET   
        hr_status = $1,
        hr_remarks = $2,
        hr_approved_at = NOW(),
        status = $4,
        updated_at = NOW()
      WHERE id = $3 AND manager_status = 'Approved'
      RETURNING *;   
    `;
     const res = await client.query(query, [
      status,
      remarks || null,
      requestID,
      nextStatus,
    ]);
    const updatedRecord = res.rows[0];
    if (updatedRecord) {
      await createNotification(client, {
        recipientId: updatedRecord.employee_id,
        title: `Reimbursement HR ${status}`,
        message:
          status === "Rejected"
            ? `Your reimbursement request was rejected by HR. Remarks: ${remarks || "None"}`
            : `Your reimbursement request for ₹${updatedRecord.total_amount} was approved by HR. Pending Finance processing.`,
        type: status === "Rejected" ? "reimbursement_hr_rejected" : "reimbursement_hr_approved",
        referenceId: requestID,
        referenceType: "reimbursement_requests",
      });
    }
    return res; 
  },

  "reimburse:approve:finance": async (
    client: any,
    requestID: string,
    actorID: string,
    body: any,
  ) => {
    const { status, remarks, disbursementTxnIdx, transactionReference } = body;
    if (!["Approved", "Rejected","Disbursed"].includes(status)) {
      throw { status: 400, message: "Invalid status for accounts approval!" };
    }

    const txnRef = transactionReference || disbursementTxnIdx || null;
    const nextStatus = status === "Rejected" ? "Rejected" : "Approved";

    const query = `
      UPDATE reimbursement_requests
      SET 
        finance_status = $1,
        finance_remarks = $2,
        transaction_reference = $3,
        disbursed_at = NOW(),
        status = $5,
        updated_at = NOW()
      WHERE id = $4 AND hr_status = 'Approved' 
      RETURNING *;
    `;
    const res= await client.query(query, [
      status,
      remarks || null,
      txnRef,
      requestID,
      nextStatus,
    ]);
    const updatedRecord = res.rows[0];
    if (updatedRecord) {
      await createNotification(client, {
        recipientId: updatedRecord.employee_id,
        title: status === "Disbursed" || status === "Approved" ? "Reimbursement Processed" : "Reimbursement Rejected",
        message:
          status === "Disbursed" || status === "Approved"
            ? `Your reimbursement claim of ₹${updatedRecord.total_amount} has been processed. Ref: ${txnRef || "N/A"}`
            : `Your reimbursement request was rejected by Finance. Remarks: ${remarks || "None"}`,
        type: status === "Rejected" ? "reimbursement_finance_rejected" : "reimbursement_processed",
        referenceId: requestID,
        referenceType: "reimbursement_requests",
      });
    }
    return res; 
  },
};

export async function GET(request: Request) {
  const pool = await getPool();
  const client = await pool.connect();
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError(
        "UNAUTHORIZED",
        "Authentication required, please try again!",
        401,
      );
    }

    const empResult = await client.query(
      `
      SELECT id
      FROM employees 
      WHERE keycloak_id = $1
      LIMIT 1;
      `,
      [authUser.sub],
    );

    if (empResult.rows.length === 0) {
      return apiError("NOT_FOUND", "Employee record not found", 404);
    }

    const employeeID = empResult.rows[0].id;
    const roles = authUser.roles || [];

    let strategyKey: keyof typeof getStrategies = "reimbursements:read-self";

    if (
      roles.includes("hr") ||
      roles.includes("hr_admin") ||
      roles.includes("finance") ||
      roles.includes("admin")
    ) {
      strategyKey = "reimbursements:read-all";
    } else if (roles.includes("manager") || roles.includes("super_manager")) {
      strategyKey = "reimbursements:read-team";
    }

    const strategy = getStrategies[strategyKey];
    const { query, params } = strategy(employeeID);
    const result = await client.query(query, params);

    return ok({
      strategy: strategyKey,
      data: result.rows,
      success: true,
    });
  } catch (error) {
    console.error("Error fetching reimbursement requests:", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to fetch reimbursement requests",
      500,
    );
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser(request);
    if (!authUser || !authUser.sub) {
      return apiError("UNAUTHORIZED", "Unauthorized, please try again!", 401);
    }

    const parsed = await parseJson(request, createReimbursementSchema);
    if (parsed.error) return parsed.error;
    console.log("passed the error check from the body",parsed.data);
    const { title, description, tripStartDate, tripEndDate, currency, items } = parsed.data;
    const result = await withTranscations(async (client) => {
      const empRes = await client.query(
        `SELECT id, status,reporting_manager_id,COALESCE(display_name,CONCAT(first_name,' ',last_name)) AS employee_name FROM employees WHERE keycloak_id = $1 LIMIT 1`,
        [authUser.sub],
      );

      if (empRes.rowCount === 0) {
        throw new Error("EMPLOYEE_NOT_FOUND");
      }
      const employee = empRes.rows[0];
      if (employee.status !== "active") {
        throw new Error("EMPLOYEE_INACTIVE");
      }

      const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

      const parentInsertQuery = `
        INSERT INTO reimbursement_requests (
          employee_id,
          title,
          description,
          trip_start_date,
          trip_end_date,
          total_amount,
          currency,
          status,
          manager_status,
          hr_status,
          finance_status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 'Pending', 'Pending', 'Pending', 'Pending'
        )
        RETURNING *;
      `;

      const parentRes = await client.query(parentInsertQuery, [
        employee.id,
        title,
        description || null,
        tripStartDate || null,
        tripEndDate || null,
        totalAmount,
        currency || "INR",
      ]);

      const parentRequest = parentRes.rows[0];
      console.log("parent tk pcha ",parentRequest);
      const itemInsertQuery = `
        INSERT INTO reimbursement_items (
          reimbursement_request_id,
          category,
          expense_date,
          amount,
          merchant_name,
          description,
          receipt_url,
          file_mime_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const insertedItems = [];
      for (const item of items) {
        const itemRes = await client.query(itemInsertQuery, [
          parentRequest.id,
          item.category,
          item.expenseDate,
          item.amount,
          item.merchantName || null,
          item.description || null,
          item.receiptUrl,
          item.fileMimeType || null,
        ]);
        insertedItems.push(itemRes.rows[0]);
      }

        if (employee.reporting_manager_id) {
          await createNotification(client, {
            recipientId: employee.reporting_manager_id,
            title: "New Reimbuersement Request ",
            message: `${employee.employee_name} has requested a reimbursement request of  ₹${totalAmount}.`,
            type: "reimbursement_requests",
            referenceId: parentRequest.id,
            referenceType: "reimbursement_requests",
          });
        }
      return {
        ...parentRequest,
        items: insertedItems,
      };
    });

    return ok({
      data: result,
      success: true,
      message: "Reimbursement request submitted successfully",
    });
  } catch (error: any) {
    console.error("Error creating reimbursement request:", error);

    if (error.message === "EMPLOYEE_NOT_FOUND") {
      return apiError("NOT_FOUND", "Employee record not found", 404);
    }
    if (error.message === "EMPLOYEE_INACTIVE") {
      return apiError(
        "FORBIDDEN",
        "Only active employees can submit requests",
        403,
      );
    }

    return apiError(
      "INTERNAL_ERROR",
      error.message || "Failed to submit reimbursement request",
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

    const parsed = await parseJson(request, updateReimbursementApprovalSchema);
    if (parsed.error) return parsed.error;

    const { requestId, status, remarks, disbursementTxnIdx, stage } =parsed.data;
    const roles = authUser.roles || [];

    // Map role and explicit request stage to strategy
    let strategyKey: keyof typeof patchStrategies | null = null;

    if (
      stage === "manager" &&
      (roles.includes("manager") ||
        roles.includes("super_manager") ||
        roles.includes("admin"))
    ) {
      strategyKey = "reimburse:approve:manager";
    } else if (
      stage === "hr" &&
      (roles.includes("hr") ||
        roles.includes("hr_admin") ||
        roles.includes("admin"))
    ) {
      strategyKey = "reimburse:approve:hr";
    } else if (
      stage === "finance" &&
      (roles.includes("finance") || roles.includes("admin"))
    ) {
      strategyKey = "reimburse:approve:finance";
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
        disbursementTxnIdx,
      });

      if (result.rowCount === 0) {
        throw new Error("PREREQUISITE_NOT_MET_OR_NOT_FOUND");
      }

      return result.rows[0];
    });

    return ok({
      data: updatedRecord,
      success: true,
      message: `Reimbursement stage '${stage}' processed successfully as ${status}`,
    });
  } catch (error: any) {
    console.error("Error updating reimbursement approval:", error);

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
      error.message || "Failed to update reimbursement request",
      500,
    );
  }
}
