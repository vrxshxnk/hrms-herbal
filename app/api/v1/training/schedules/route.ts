import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { createTrainingScheduleSchema } from "@/app/validations/phase1_schema"; // Adjust path if needed

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile does not exist or is inactive!", 401);
    }

    const pool = getPool();
    let query = "";
    let params: any[] = [];

    if (user.system_role === "hr" || user.system_role === "admin") {
      // HR/Admin can view all schedules with module & department details
      query = `
        SELECT 
          ts.*,
          tm.title as module_title,
          tm.code as module_code,
          tm.category as module_category,
          tm.duration_seconds,
          d.name as department_name
        FROM training_schedules ts
        JOIN training_modules tm ON ts.training_module_id = tm.id
        JOIN departments d ON ts.department_id = d.id
        ORDER BY ts.start_date DESC;
      `;
    } else {
      // Employees see only schedules assigned to their department
      query = `
        SELECT 
          ts.*,
          tm.title as module_title,
          tm.code as module_code,
          tm.category as module_category,
          tm.duration_seconds,
          tm.video_url,
          tm.video_provider,
          tm.thumbnail_url,
          tm.completion_threshold,
          tm.requires_acknowledgement,
          etp.status as employee_status,
          etp.watch_percent,
          etp.max_watched_seconds,
          etp.last_position_seconds,
          etp.video_completed_at,
          etp.acknowledged_at
        FROM training_schedules ts
        JOIN training_modules tm ON ts.training_module_id = tm.id
        JOIN employees e ON e.id = $1
        LEFT JOIN employee_training_progress etp ON etp.training_schedule_id = ts.id AND etp.employee_id = e.id
        WHERE ts.department_id = e.department_id AND ts.status IN ('scheduled', 'active')
        ORDER BY ts.start_date ASC;
      `;
      params = [user.id];
    }

    const result = await pool.query(query, params);
    return ok({ data: result.rows, success: true });
  } catch (error: any) {
    console.error("Schedule fetch error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch schedules", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile does not exist or is inactive!", 401);
    }

    if (user.system_role !== "hr" && user.system_role !== "admin") {
      return apiError("FORBIDDEN", "You do not have permission to create training schedules", 403);
    }

    const validationResult = await parseJson(request, createTrainingScheduleSchema);
    if (validationResult.error) {
      return apiError("BAD_REQUEST", "Invalid request payload", 400);
    }

    const { training_module_id, department_id, start_date, due_date, notes } = validationResult.data;

    // Use transaction to create schedule and auto-initialize progress rows for employees in the department
    const result = await withTranscations(async (client) => {
      const scheduleQuery = `
        INSERT INTO training_schedules (
          training_module_id, department_id, scheduled_by, start_date, due_date, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
        RETURNING *;
      `;
      const scheduleRes = await client.query(scheduleQuery, [
        training_module_id,
        department_id,
        user.id,
        start_date,
        due_date || null,
        notes || null,
      ]);
      const newSchedule = scheduleRes.rows[0];

      // Auto-create progress entries for all active employees in this department
      const initProgressQuery = `
        INSERT INTO employee_training_progress (training_schedule_id, employee_id, status)
        SELECT $1, id, 'not_started'
        FROM employees
        WHERE department_id = $2 AND status = 'active'
        ON CONFLICT (training_schedule_id, employee_id) DO NOTHING;
      `;
      await client.query(initProgressQuery, [newSchedule.id, department_id]);

      return newSchedule;
    });

    return ok({
      data: result,
      success: true,
      message: "Training schedule created and assigned successfully",
    });
  } catch (error: any) {
    console.error("Schedule creation error:", error);
    if (error.code === "23505") {
      return apiError("CONFLICT", "A schedule for this module and department on this start date already exists.", 409);
    }
    return apiError("INTERNAL_ERROR", error.message || "Failed to create training schedule", 500);
  }
}