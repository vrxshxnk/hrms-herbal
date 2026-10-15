import * as XLSX from "xlsx";

export interface ProviderEmployeeMapping {
  providerCode: string;
  employeeCode: string;
}

const text = (value: unknown) => String(value ?? "").trim();
const header = (value: unknown) => text(value).toLowerCase().replace(/[\s_-]+/g, "");

/** Parses a two-column mapping file with provider_code and employee_code headers. */
export function parseProviderEmployeeMappings(contents: ArrayBuffer): ProviderEmployeeMapping[] {
  const workbook = XLSX.read(contents, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("The mapping workbook has no worksheet");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, defval: "", raw: false });
  const headerIndex = rows.findIndex((row) => row.some((cell) => header(cell) === "providercode"));
  if (headerIndex < 0) throw new Error("Mapping file must contain a provider_code column");

  const headers = rows[headerIndex].map(header);
  const providerIndex = headers.indexOf("providercode");
  const employeeIndex = headers.indexOf("employeecode");
  if (employeeIndex < 0) throw new Error("Mapping file must contain an employee_code column");

  const mappings: ProviderEmployeeMapping[] = [];
  const seen = new Map<string, string>();
  const providerCodeByEmployeeCode = new Map<string, string>();
  for (const row of rows.slice(headerIndex + 1)) {
    const providerCode = text(row[providerIndex]);
    const employeeCode = text(row[employeeIndex]);
    if (!providerCode && !employeeCode) continue;
    if (!providerCode || !employeeCode) {
      throw new Error("Every mapping row needs both provider_code and employee_code");
    }
    if (providerCode.length > 50 || employeeCode.length > 50) {
      throw new Error("Provider and HRMS employee codes must be 50 characters or fewer");
    }
    const existing = seen.get(providerCode);
    if (existing && existing !== employeeCode) {
      throw new Error(`Provider code ${providerCode} appears more than once with different employee codes`);
    }
    const existingProviderCode = providerCodeByEmployeeCode.get(employeeCode);
    if (existingProviderCode && existingProviderCode !== providerCode) {
      throw new Error(`HRMS employee code ${employeeCode} appears more than once with different provider codes`);
    }
    seen.set(providerCode, employeeCode);
    providerCodeByEmployeeCode.set(employeeCode, providerCode);
  }

  for (const [providerCode, employeeCode] of seen) mappings.push({ providerCode, employeeCode });
  if (!mappings.length) throw new Error("The mapping file has no mapping rows");
  return mappings;
}
