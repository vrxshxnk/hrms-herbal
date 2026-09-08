import { getPool } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/auth";
import { taskInputSchema } from "@/app/validations/phase1_schema";

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser(request);
  const hasAccess =
    authUser.roles.includes("hr") || authUser.roles.includes("manager");
  if (!hasAccess) {
    return apiError("FORBIDDEN", "You don't have access for this!", 403);
  }

  const parsed = await parseJson(request, taskInputSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  const client = await getPool().connect();

  try {
    const targetEmpResult = await client.query(
      `SELECT id, reporting_manager_id, super_manager_id 
       FROM employees 
       WHERE id = $1`,
      [data.assigned_to],
    );
    const targetEmp = targetEmpResult.rows[0];
    if (!targetEmp) {
      return apiError("NOT_FOUND", "Assigned employee does not exist", 404);
    }

    const currentEmpResult = await client.query(
      `SELECT id, display_name, first_name, last_name 
       FROM employees 
       WHERE keycloak_id = $1`,
      [authUser.sub],
    );
    const currentEmp = currentEmpResult.rows[0];
    if (!currentEmp) {
      return apiError(
        "NOT_FOUND",
        "Current user employee record not found",
        404,
      );
    }
    const currentEmpId = currentEmp.id;
    const isHR = authUser.roles.some((r) =>
      ["hr", "hradmin", "hr_admin"].includes(r.toLowerCase()),
    );
    const checkIfManager =
      currentEmpId === targetEmp.reporting_manager_id ||
      currentEmpId === targetEmp.super_manager_id ||
      currentEmpId === targetEmp.id;

    if (!isHR && !checkIfManager) {
      return apiError(
        "FORBIDDEN",
        "You can only assign tasks to employees within your reporting line",
        403,
      );
    }

    await client.query("BEGIN");
    const insertTaskQuery = `
      INSERT INTO tasks (title, description, assigned_to, assigned_by, priority, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, description, assigned_to, assigned_by, priority, due_date, status, created_at;
    `;
    const taskResult = await client.query(insertTaskQuery, [
      data.title,
      data.description || null,
      data.assigned_to,
      currentEmpId,
      data.priority || "medium",
      data.due_date || null,
    ]);
    const createdTask = taskResult.rows[0];
    const managerName =
      currentEmp.display_name ||
      `${currentEmp.first_name} ${currentEmp.last_name}`.trim();

    const insertNotificationQuery = `
      INSERT INTO notifications (recipient_id, title, message, type, entity_type, reference_id)
      VALUES ($1, $2, $3, $4, $5, $6);
    `;
    await client.query(insertNotificationQuery, [
      data.assigned_to,
      "New Task Assigned",
      `${managerName} assigned you a new task: "${data.title}"`,
      "task_assigned",
      "task",
      createdTask.id,
    ]);

    await client.query("COMMIT");
    return ok({
      success: true,
      message: "Task created successfully",
      data: createdTask,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error while creating task:", error);
    return apiError("INTERNAL_ERROR", "Failed to create task", 500);
  } finally {
    client.release();
  }
}
