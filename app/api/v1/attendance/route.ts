import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { parseJson } from "@/app/lib/api/validation";
import { createAttendanceRecordSchema } from "@/app/validations/phase1_schema";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";


const attendanceStrategies = {
  "attendance:read:all": (_userId: string, monthStr: string) => ({
    query: `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.display_name,
        e.profile_photo_url,
        e.employee_code,
        COALESCE(
          json_object_agg(
            EXTRACT(DAY FROM ar.attendance_date)::int,
            ar.status
          ) FILTER (WHERE ar.id IS NOT NULL), 
          '{}'::json
        ) AS daily_attendance
      FROM employees e
      LEFT JOIN attendance_records ar 
        ON e.id = ar.employee_id 
        AND to_char(ar.attendance_date, 'YYYY-MM') = $1
      GROUP BY e.id, e.first_name, e.last_name, e.display_name, e.profile_photo_url, e.employee_code
      ORDER BY e.first_name ASC
    `,
    params: [monthStr],
  }),

  "attendance:read:team": (userId: string, monthStr: string) => ({
    query: `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.display_name,
        e.profile_photo_url,
        e.employee_code,
        COALESCE(
          json_object_agg(
            EXTRACT(DAY FROM ar.attendance_date)::int,
            ar.status
          ) FILTER (WHERE ar.id IS NOT NULL), 
          '{}'::json
        ) AS daily_attendance
      FROM employees e
      LEFT JOIN attendance_records ar 
        ON e.id = ar.employee_id 
        AND to_char(ar.attendance_date, 'YYYY-MM') = $1
      WHERE (e.id = $2 OR e.reporting_manager_id = $2)
      GROUP BY e.id, e.first_name, e.last_name, e.display_name, e.profile_photo_url, e.employee_code
      ORDER BY e.first_name ASC
    `,
    params: [monthStr, userId],
  }),

  "attendance:read:self": (userId: string, monthStr: string) => ({
    query: `
      SELECT 
        e.id,
        e.first_name,
        e.last_name,
        e.display_name,
        e.profile_photo_url,
        e.employee_code,
        COALESCE(
          json_object_agg(
            EXTRACT(DAY FROM ar.attendance_date)::int,
            ar.status
          ) FILTER (WHERE ar.id IS NOT NULL), 
          '{}'::json
        ) AS daily_attendance
      FROM employees e
      LEFT JOIN attendance_records ar 
        ON e.id = ar.employee_id 
        AND to_char(ar.attendance_date, 'YYYY-MM') = $1
      WHERE e.id = $2
      GROUP BY e.id, e.first_name, e.last_name, e.display_name, e.profile_photo_url, e.employee_code
    `,
    params: [monthStr, userId],
  }),
};

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    }

    const { searchParams } = new URL(request.url);
    const today = new Date();
    // Default to current year and month if not provided
    const month = searchParams.get("month") || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let strategyFn: (userId: string, monthStr: string) => { query: string; params: any[] };

    if (user.system_role === "hr" || user.system_role === "hr_admin") {
      strategyFn = attendanceStrategies["attendance:read:all"];
    } else if (user.system_role === "manager") {
      strategyFn = attendanceStrategies["attendance:read:team"];
    } else {
      strategyFn = attendanceStrategies["attendance:read:self"];
    }

    // Now all functions take exactly 2 arguments cleanly
    const { query, params } = strategyFn(user.id, month);

    const client = await getPool().connect();
    try {
      const result = await client.query(query, params);
      return ok({data: result.rows, success:true});
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error("Attendance Fetch Error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to fetch attendance", 500);
  }
}

export async function POST(request: Request) {
  try {
   
    const user = await getDBUserProfile(request);
    if (!user) {
      return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    }
    const parsed = await parseJson(request, createAttendanceRecordSchema);
    if (parsed.error) return parsed.error;
    const data = parsed.data;

 
    const isSelf = data.employee_id === user.id;
    const isHR = user.system_role === "hr" || user.system_role === "hr_admin";

    if (!isSelf && !isHR) {
      return apiError("FORBIDDEN", "You are only permitted to record or adjust your own attendance", 403);
    }


    const attendanceRecord = await withTranscations(async (client) => {
      const existingRes = await client.query(
        `SELECT id, status, check_in_time, check_out_time, working_hours 
         FROM attendance_records 
         WHERE employee_id = $1 AND attendance_date = $2`,
        [data.employee_id, data.attendance_date]
      );
      const existingRecord = existingRes.rows[0];

      const isRegularized = Boolean(existingRecord || (isHR && !isSelf));
      const source = isHR && !isSelf ? "manual_hr" : data.source;

      const upsertQuery = `
        INSERT INTO attendance_records (
          employee_id,
          attendance_date,
          status,
          check_in_time,
          check_out_time,
          working_hours,
          location_id,
          shift_id,
          source,
          is_regularized,
          regularized_by,
          regularization_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (employee_id, attendance_date) 
        DO UPDATE SET
          status = EXCLUDED.status,
          check_in_time = EXCLUDED.check_in_time,
          check_out_time = EXCLUDED.check_out_time,
          working_hours = EXCLUDED.working_hours,
          location_id = EXCLUDED.location_id,
          shift_id = EXCLUDED.shift_id,
          source = EXCLUDED.source,
          is_regularized = EXCLUDED.is_regularized,
          regularized_by = EXCLUDED.regularized_by,
          regularization_reason = EXCLUDED.regularization_reason
        RETURNING *;
      `;

      const values = [
        data.employee_id,
        data.attendance_date,
        data.status,
        data.check_in_time,
        data.check_out_time,
        data.working_hours,
        data.location_id,
        data.shift_id,
        source,
        isRegularized,
        isRegularized ? user.id : null,
        data.regularization_reason || null,
      ];

      const savedRes = await client.query(upsertQuery, values);
      const savedRecord = savedRes.rows[0];
      if (existingRecord) {
        await client.query(
          `INSERT INTO attendance_audit_logs (
            attendance_record_id,
            employee_id,
            field_changed,
            previous_value,
            new_value,
            changed_by,
            reason,
            change_source
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            savedRecord.id,
            data.employee_id,
            "attendance_overwrite",
            JSON.stringify(existingRecord),
            JSON.stringify({
              status: savedRecord.status,
              check_in_time: savedRecord.check_in_time,
              check_out_time: savedRecord.check_out_time,
              working_hours: savedRecord.working_hours,
            }),
            user.id,
            data.regularization_reason || "HR Direct Regularization",
            isHR ? "hr_portal" : "employee_web",
          ]
        );
      }

      return savedRecord;
    });

    return ok(attendanceRecord);
  } catch (error: any) {
    console.error("Error while creating/updating attendance record:", error);
    return apiError("INTERNAL_ERROR", error.message || "Failed to process attendance entry", 500);
  }
}
