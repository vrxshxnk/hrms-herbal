import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { updateTrainingProgressSchema } from "@/app/validations/phase1_schema"; 

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile does not exist or is inactive!", 401);
    }

    const url = new URL(request.url);
    const scheduleId = url.searchParams.get("schedule_id");

    const pool = getPool();
    let query = "";
    let params: any[] = [];

    if (user.system_role === "hr" || user.system_role === "admin") {
      if (scheduleId) {
        query = `
          SELECT etp.*, e.first_name, e.last_name, e.work_email, e.department_id
          FROM employee_training_progress etp
          JOIN employees e ON etp.employee_id = e.id
          WHERE etp.training_schedule_id = $1;
        `;
        params = [scheduleId];
      } else {
        query = `
          SELECT etp.*, e.first_name, e.last_name, tm.title as module_title
          FROM employee_training_progress etp
          JOIN employees e ON etp.employee_id = e.id
          JOIN training_schedules ts ON etp.training_schedule_id = ts.id
          JOIN training_modules tm ON ts.training_module_id = tm.id
          ORDER BY etp.updated_at DESC LIMIT 100;
        `;
      }
    } else {
    
      query = `
        SELECT etp.*, tm.title, tm.video_url, tm.duration_seconds, tm.completion_threshold, tm.requires_acknowledgement
        FROM employee_training_progress etp
        JOIN training_schedules ts ON etp.training_schedule_id = ts.id
        JOIN training_modules tm ON ts.training_module_id = tm.id
        WHERE etp.employee_id = $1;
      `;
      params = [user.id];
    }

    const result = await pool.query(query, params);
    return ok({ data: result.rows, success: true });
  } catch (error: any) {
    console.error("Progress fetch error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch progress", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile does not exist or is inactive!", 401);
    }

    const validationResult = await parseJson(request, updateTrainingProgressSchema);
    if (validationResult.error) {
      return apiError("BAD_REQUEST", "Invalid tracking payload", 400);
    }

    const { training_schedule_id, watch_seconds, current_position, acknowledged } = validationResult.data;
    const pool = getPool();
    const checkQuery = `
      SELECT 
        etp.id as progress_id,
        etp.status,
        etp.max_watched_seconds,
        etp.video_completed_at,
        etp.acknowledged_at,
        tm.duration_seconds,
        tm.completion_threshold,
        tm.requires_acknowledgement
      FROM employee_training_progress etp
      JOIN training_schedules ts ON etp.training_schedule_id = ts.id
      JOIN training_modules tm ON ts.training_module_id = tm.id
      WHERE etp.training_schedule_id = $1 AND etp.employee_id = $2;
    `;
    const checkRes = await pool.query(checkQuery, [training_schedule_id, user.id]);
    if (checkRes.rows.length === 0) {
      return apiError("NOT_FOUND", "Training progress record not found", 404);
    }

    const row = checkRes.rows[0];
    const newMaxWatched = Math.max(row.max_watched_seconds, watch_seconds);
    const calculatedPercent = Number(((newMaxWatched / row.duration_seconds) * 100).toFixed(2));
    const effectivePercent = Math.min(calculatedPercent, 100.00);
    let newStatus = row.status === "completed" ? "completed" : "in_progress";
    if (row.status === "not_started") {
      newStatus = "in_progress";
    }

    const isVideoDone = effectivePercent >= row.completion_threshold;
    const isAcknowledgedDone = row.requires_acknowledgement ? (acknowledged || row.acknowledged_at) : true;

    if (isVideoDone && (!row.requires_acknowledgement || isAcknowledgedDone)) {
      newStatus = "completed";
    }

    const updateQuery = `
      UPDATE employee_training_progress
      SET 
        watch_percent = $1,
        max_watched_seconds = $2,
        last_position_seconds = $3,
        status = $4,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        video_completed_at = CASE WHEN $5 AND video_completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE video_completed_at END,
        acknowledged_at = CASE WHEN $6 AND acknowledged_at IS NULL THEN CURRENT_TIMESTAMP ELSE acknowledged_at END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;

    const updateValues = [
      effectivePercent,
      newMaxWatched,
      current_position,
      newStatus,
      isVideoDone,
      acknowledged ? true : false,
      row.progress_id,
    ];

    const updateRes = await pool.query(updateQuery, updateValues);

    return ok({
      data: updateRes.rows[0],
      success: true,
      message: "Progress updated successfully",
    });
  } catch (error: any) {
    console.error("Progress update error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to update progress", 500);
  }
}