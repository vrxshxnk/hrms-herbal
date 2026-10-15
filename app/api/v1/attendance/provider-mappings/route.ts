import { getPool, withTranscations } from "@/app/lib/api/client";
import { apiError, ok } from "@/app/lib/api/response";
import { getDBUserProfile } from "@/app/lib/auth/user-profile";
import { parseProviderEmployeeMappings } from "@/app/lib/attendance/provider-mapping";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const canManageMappings = (role: string) => ["hr", "hr_admin", "system_admin"].includes(role);

export async function GET(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    if (!canManageMappings(user.system_role)) return apiError("FORBIDDEN", "Only HR can view provider employee mappings", 403);
    const client = await getPool().connect();
    try {
      const result = await client.query(
        `SELECT m.provider_code AS "providerCode", e.employee_code AS "employeeCode",
                COALESCE(NULLIF(e.display_name, ''), CONCAT(e.first_name, ' ', e.last_name)) AS "employeeName"
         FROM attendance_provider_employee_mappings m
         JOIN employees e ON e.id = m.employee_id
         ORDER BY m.provider_code`,
      );
      return ok(result.rows);
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    console.error("Provider mapping list failed:", error);
    return apiError("INTERNAL_ERROR", "Could not load provider mappings", 500);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getDBUserProfile(request);
    if (!user) return apiError("UNAUTHORIZED", "User profile not found or inactive", 401);
    if (!canManageMappings(user.system_role)) return apiError("FORBIDDEN", "Only HR can manage provider employee mappings", 403);

    const formData = await request.formData();
    const file = formData.get("file");
    const action = formData.get("action") === "commit" ? "commit" : "preview";
    if (!(file instanceof File)) return apiError("VALIDATION_ERROR", "A mapping file is required", 422);
    if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return apiError("VALIDATION_ERROR", "The mapping file must be between 1 byte and 2 MB", 422);
    }
    if (!/\.(csv|xls|xlsx)$/i.test(file.name)) {
      return apiError("VALIDATION_ERROR", "Upload a .csv, .xls, or .xlsx mapping file", 422);
    }

    const mappings = parseProviderEmployeeMappings(await file.arrayBuffer());
    const employeeCodes = [...new Set(mappings.map((mapping) => mapping.employeeCode))];
    const client = await getPool().connect();
    let employees: { id: string; employee_code: string; display_name: string | null; first_name: string; last_name: string }[];
    try {
      const result = await client.query(
        "SELECT id, employee_code, display_name, first_name, last_name FROM employees WHERE employee_code = ANY($1::text[])",
        [employeeCodes],
      );
      employees = result.rows;
    } finally {
      client.release();
    }
    const employeeByCode = new Map(employees.map((employee) => [employee.employee_code, employee]));
    const unknownEmployeeCodes = employeeCodes.filter((code) => !employeeByCode.has(code));
    const validMappings = mappings.filter((mapping) => employeeByCode.has(mapping.employeeCode));

    const describeMappings = async (query: (sql: string, values: unknown[]) => Promise<{ rows: { provider_code: string; employee_id: string; employee_code: string }[] }>) => {
      const current = await query(
        `SELECT m.provider_code, m.employee_id, e.employee_code
         FROM attendance_provider_employee_mappings m
         JOIN employees e ON e.id = m.employee_id
         WHERE m.provider_code = ANY($1::text[]) OR m.employee_id = ANY($2::uuid[])`,
        [mappings.map((mapping) => mapping.providerCode), validMappings.map((mapping) => employeeByCode.get(mapping.employeeCode)!.id)],
      );
      const byProvider = new Map(current.rows.map((row) => [row.provider_code, row]));
      const byEmployee = new Map(current.rows.map((row) => [row.employee_id, row]));
      return validMappings.map((mapping) => {
        const employee = employeeByCode.get(mapping.employeeCode)!;
        const oldProvider = byProvider.get(mapping.providerCode);
        const oldEmployee = byEmployee.get(employee.id);
        const replacing = (oldProvider && oldProvider.employee_id !== employee.id)
          || (oldEmployee && oldEmployee.provider_code !== mapping.providerCode);
        return {
          providerCode: mapping.providerCode,
          employeeCode: mapping.employeeCode,
          employeeName: employee.display_name || `${employee.first_name} ${employee.last_name}`.trim(),
          replaces: replacing ? [
            oldProvider && oldProvider.employee_id !== employee.id ? `${mapping.providerCode} currently belongs to ${oldProvider.employee_code}` : null,
            oldEmployee && oldEmployee.provider_code !== mapping.providerCode ? `${mapping.employeeCode} currently uses ${oldEmployee.provider_code}` : null,
          ].filter(Boolean).join("; ") : null,
        };
      });
    };

    if (action === "preview") {
      const client = await getPool().connect();
      try {
        const details = await describeMappings((sql, values) => client.query(sql, values));
        return ok({ action, totalMappings: mappings.length, validMappings: validMappings.length, unknownEmployeeCodes, details });
      } finally {
        client.release();
      }
    }
    if (unknownEmployeeCodes.length) {
      return apiError("VALIDATION_ERROR", "Fix the HRMS employee_code values before saving mappings", 422, { unknownEmployeeCodes });
    }

    await withTranscations(async (tx) => {
      const details = await describeMappings((sql, values) => tx.query(sql, values));
      if (details.some((detail) => detail.replaces) && formData.get("confirmReplacements") !== "true") {
        throw new Error("Some saved pay code mappings would be replaced. Preview again and confirm the replacements.");
      }
      const providerCodes = mappings.map((mapping) => mapping.providerCode);
      const employeeIds = mappings.map((mapping) => employeeByCode.get(mapping.employeeCode)!.id);
      // Replacing a mapping is intentional only for codes/employees named in this upload.
      await tx.query(
        "DELETE FROM attendance_provider_employee_mappings WHERE provider_code = ANY($1::text[]) OR employee_id = ANY($2::uuid[])",
        [providerCodes, employeeIds],
      );
      for (const mapping of mappings) {
        await tx.query(
          "INSERT INTO attendance_provider_employee_mappings (provider_code, employee_id) VALUES ($1, $2)",
          [mapping.providerCode, employeeByCode.get(mapping.employeeCode)!.id],
        );
      }
    });
    return ok({ action, savedMappings: mappings.length, unknownEmployeeCodes: [] });
  } catch (error: unknown) {
    console.error("Provider mapping import failed:", error);
    return apiError("BAD_REQUEST", error instanceof Error ? error.message : "Could not read the provider mapping file", 400);
  }
}
