import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { parsePerformanceRegister } from "@/app/lib/attendance/provider-register";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function canImport(systemRole: string) {
  return ["hr", "hr_admin", "system_admin"].includes(systemRole);
}

export async function POST(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    if (!canImport(user.system_role)) return apiError("FORBIDDEN", "Only HR can import provider attendance files", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    const action = formData.get("action") === "commit" ? "commit" : "preview";
    if (!(file instanceof File)) return apiError("VALIDATION_ERROR", "An Excel file is required", 422);
    if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return apiError("VALIDATION_ERROR", "The attendance file must be between 1 byte and 10 MB", 422);
    }
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      return apiError("VALIDATION_ERROR", "Upload a .xls or .xlsx provider register", 422);
    }

    const parsed = parsePerformanceRegister(await file.arrayBuffer());
    const client = await getPool().connect();
    let employees: { id: string; employee_code: string }[];
    try {
      const result = await client.query(
        "SELECT id, employee_code FROM employees WHERE employee_code = ANY($1::text[])",
        [parsed.employeeCodes],
      );
      employees = result.rows;
    } finally {
      client.release();
    }
    const employeeIds = new Map(employees.map((employee) => [employee.employee_code, employee.id]));
    const validRows = parsed.rows.filter((row) => employeeIds.has(row.employeeCode));
    const unmatchedEmployeeCodes = parsed.employeeCodes.filter((code) => !employeeIds.has(code));

    if (action === "preview") {
      return ok({
        action,
        period: { start: parsed.periodStart, end: parsed.periodEnd },
        employeeCount: parsed.employeeCodes.length,
        validRows: validRows.length,
        skippedRows: parsed.skippedRows,
        unmatchedEmployeeCodes,
        sample: validRows.slice(0, 10),
      });
    }
    if (!validRows.length) {
      return apiError("VALIDATION_ERROR", "No rows could be matched to HRMS employee codes", 422, { unmatchedEmployeeCodes });
    }

    const imported = await withTranscations(async (tx) => {
      let importedRows = 0;
      let preservedManualRows = 0;
      for (const row of validRows) {
        const result = await tx.query(
          `INSERT INTO attendance_records (
             employee_id, attendance_date, status, check_in_time, check_out_time,
             working_hours, overtime_hours, provider_status, shift_code, source,
             is_manual_override, imported_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'provider_import', FALSE, CURRENT_TIMESTAMP)
           ON CONFLICT (employee_id, attendance_date) DO UPDATE SET
             status = EXCLUDED.status,
             check_in_time = EXCLUDED.check_in_time,
             check_out_time = EXCLUDED.check_out_time,
             working_hours = EXCLUDED.working_hours,
             overtime_hours = EXCLUDED.overtime_hours,
             provider_status = EXCLUDED.provider_status,
             shift_code = EXCLUDED.shift_code,
             source = EXCLUDED.source,
             is_regularized = FALSE,
             regularized_by = NULL,
             regularization_reason = NULL,
             imported_at = CURRENT_TIMESTAMP
           WHERE attendance_records.is_manual_override = FALSE
           RETURNING id`,
          [
            employeeIds.get(row.employeeCode), row.attendanceDate, row.status,
            row.checkInTime, row.checkOutTime, row.workingHours, row.overtimeHours,
            row.providerStatus, row.shiftCode,
          ],
        );
        if (result.rowCount) importedRows += 1;
        else preservedManualRows += 1;
      }
      return { importedRows, preservedManualRows };
    });

    return ok({
      action,
      period: { start: parsed.periodStart, end: parsed.periodEnd },
      ...imported,
      unmatchedEmployeeCodes,
      skippedRows: parsed.skippedRows,
    });
  } catch (error: unknown) {
    console.error("Attendance import failed:", error);
    const message = error instanceof Error ? error.message : "Could not read the provider attendance register";
    return apiError("BAD_REQUEST", message, 400);
  }
}
