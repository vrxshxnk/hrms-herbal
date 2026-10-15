"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, Upload, ClipboardPenLine } from "lucide-react";
import { attendanceTimestamp, hoursMinutesToDecimal, isOvernight } from "../lib/attendance/time";

export interface AttendanceEmployeeOption {
  id: string;
  employee_code?: string;
  first_name: string;
  last_name: string;
  display_name?: string;
}

type ImportPreview = {
  period: { start: string; end: string };
  employeeCount: number;
  validRows: number;
  skippedRows: number;
  unmatchedEmployeeCodes: string[];
  importedRows?: number;
  preservedManualRows?: number;
};

type MappingPreview = {
  totalMappings?: number;
  validMappings?: number;
  unknownEmployeeCodes: string[];
  savedMappings?: number;
  details?: { providerCode: string; employeeCode: string; employeeName: string; replaces: string | null }[];
};
type SavedMapping = { providerCode: string; employeeCode: string; employeeName: string };

const providerCodeFor = (status: string) => ({
  present: "P", absent: "A", week_off: "WO", holiday: "H", half_day: "HLF", on_leave: "L",
}[status] ?? "");

export default function AttendanceActions({
  token,
  employees,
  canImport,
  onChanged,
}: {
  token: string | null;
  employees: AttendanceEmployeeOption[];
  canImport: boolean;
  onChanged: () => void;
}) {
  const [activeTool, setActiveTool] = useState<"import" | "manual" | "mapping">(canImport ? "import" : "manual");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mappingFile, setMappingFile] = useState<File | null>(null);
  const [mappingPreview, setMappingPreview] = useState<MappingPreview | null>(null);
  const [savedMappings, setSavedMappings] = useState<SavedMapping[]>([]);
  const [confirmReplacements, setConfirmReplacements] = useState(false);
  const [mappingBusy, setMappingBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "", attendance_date: (() => {
      const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
      return `${part("year")}-${part("month")}-${part("day")}`;
    })(), status: "present",
    shift_code: "", check_in_time: "", check_out_time: "", working_hours: "0", overtime_hours: "0",
  });

  const loadSavedMappings = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch("/api/v1/attendance/provider-mappings", { headers: { Authorization: `Bearer ${token}` } });
      const json = await response.json();
      if (response.ok && Array.isArray(json.data)) setSavedMappings(json.data);
    } catch { /* The upload flow reports its own errors. */ }
  }, [token]);

  useEffect(() => {
    if (!canImport || !token) return;
    const controller = new AbortController();
    fetch("/api/v1/attendance/provider-mappings", { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal })
      .then(async (response) => {
        if (response.ok) {
          const json = await response.json();
          if (Array.isArray(json.data)) setSavedMappings(json.data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [canImport, token]);

  const upload = async (action: "preview" | "commit") => {
    if (!file || !token) return;
    setImporting(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("action", action);
      const response = await fetch("/api/v1/attendance/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Could not import the attendance register");
      const data = json.data as ImportPreview;
      if (action === "preview") setPreview(data);
      if (action === "commit") {
        setMessage(`${data.importedRows ?? 0} rows imported. ${data.preservedManualRows ?? 0} manual row(s) preserved.`);
        onChanged();
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not read the attendance register");
    } finally {
      setImporting(false);
    }
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setPreview(null);
    setMessage(null);
  };

  const uploadMappings = async (action: "preview" | "commit") => {
    if (!mappingFile || !token) return;
    setMappingBusy(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", mappingFile);
      body.append("action", action);
      if (confirmReplacements) body.append("confirmReplacements", "true");
      const response = await fetch("/api/v1/attendance/provider-mappings", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Could not read the mapping file");
      const data = json.data as MappingPreview;
      if (action === "preview") { setMappingPreview(data); setConfirmReplacements(false); }
      if (action === "commit") {
        setMappingPreview(null);
        setPreview(null);
        setMessage(`${data.savedMappings ?? 0} provider Pay Code mapping(s) saved. Return to Import register to preview the file again.`);
        await loadSavedMappings();
      }
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not save provider mappings");
    } finally {
      setMappingBusy(false);
    }
  };

  const downloadMappingTemplate = () => {
    const template = new Blob(["provider_code,employee_code\n"], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(template);
    const link = document.createElement("a");
    link.href = url;
    link.download = "provider-pay-code-mapping.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSavedMappings = () => {
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = '\uFEFFprovider_code,employee_code,employee_name\r\n' + savedMappings.map(item => [item.providerCode, item.employeeCode, item.employeeName].map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "saved-provider-pay-code-mappings.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitManual = async (event: FormEvent) => {
    event.preventDefault();
    const employeeId = form.employee_id || employees[0]?.id;
    if (!token || !employeeId) return;
    setImporting(true);
    setMessage(null);
    try {
      const overnight = isOvernight(form.check_in_time, form.check_out_time);
      const response = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employee_id: employeeId,
          check_in_time: attendanceTimestamp(form.attendance_date, form.check_in_time),
          check_out_time: attendanceTimestamp(form.attendance_date, form.check_out_time, overnight),
          working_hours: hoursMinutesToDecimal(form.working_hours),
          overtime_hours: hoursMinutesToDecimal(form.overtime_hours),
          provider_status: providerCodeFor(form.status),
          source: "manual",
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || "Could not save manual attendance");
      setMessage("Manual attendance saved. It will not be overwritten by a provider import.");
      onChanged();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Could not save manual attendance");
    } finally {
      setImporting(false);
    }
  };

  return (
    <section aria-label="Attendance tools">
      <div className="workflow-tabs" aria-label="Choose an attendance task">
        {canImport && <button type="button" aria-pressed={activeTool === "import"} onClick={() => { setActiveTool("import"); setMessage(null); }}><FileSpreadsheet size={16} />Import register</button>}
        <button type="button" aria-pressed={activeTool === "manual"} onClick={() => { setActiveTool("manual"); setMessage(null); }}><ClipboardPenLine size={16} />Manual entry</button>
        {canImport && <button type="button" aria-pressed={activeTool === "mapping"} onClick={() => { setActiveTool("mapping"); setMessage(null); }}>Pay code mapping</button>}
      </div>

      {canImport && activeTool === "import" && <div className="workflow-panel">
        <div className="flex gap-3 items-start"><span className="workflow-step">1</span><div><h2 className="text-sm font-semibold">Import a provider register</h2><p className="mt-1 text-xs text-slate-500 leading-relaxed">Upload your monthly Performance Register, review the matches, then import. Existing manual entries are preserved.</p></div></div>
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-brand-200 bg-brand-50/40 p-5">
          <input aria-label="Provider attendance file" type="file" accept=".xls,.xlsx" onChange={onFileChange} className="max-w-full flex-1 text-xs" />
          <button type="button" disabled={!file || importing} onClick={() => upload("preview")} className="button-primary disabled:opacity-50">{importing && <Loader2 size={14} className="animate-spin" />}Preview register</button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Accepts .xls and .xlsx · IN1 = check-in · Out2 = check-out · Out1 and IN2 are unused.</p>
        {preview && <div className="mt-5 border-t border-slate-200 pt-5">
          <div className="flex gap-3 items-center"><span className="workflow-step">2</span><h3 className="text-sm font-semibold">Review before importing</h3><span className="ml-auto text-xs text-slate-500">{preview.period.start} — {preview.period.end}</span></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">{[{ value: preview.validRows, label: "Matched daily rows" }, { value: preview.employeeCount, label: "Employees in file" }, { value: preview.unmatchedEmployeeCodes.length, label: "Unmatched pay codes" }, { value: preview.skippedRows, label: "Blank rows skipped" }].map(item => <div className="rounded-lg bg-slate-50 p-4" key={item.label}><strong className="block text-xl font-semibold">{item.value}</strong><span className="text-[11px] text-slate-500">{item.label}</span></div>)}</div>
          {preview.unmatchedEmployeeCodes.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"><p className="font-semibold">Some employees need a pay code mapping.</p><p className="mt-1 leading-relaxed">These employees will not be imported until their provider codes are linked to HRMS employees.</p><details className="mt-3"><summary>View {preview.unmatchedEmployeeCodes.length} unmatched codes</summary><p className="mt-2 leading-relaxed break-words">{preview.unmatchedEmployeeCodes.join(", ")}</p></details><button type="button" onClick={() => setActiveTool("mapping")} className="mt-3 underline underline-offset-4 font-semibold">Set up pay code mapping</button></div>}
          <button type="button" disabled={!preview.validRows || importing} onClick={() => upload("commit")} className="button-primary mt-5 disabled:opacity-50"><Upload size={15} />{importing ? "Processing…" : `Import ${preview.validRows} matched rows`}</button>
        </div>}
      </div>}

      {canImport && activeTool === "mapping" && <div className="workflow-panel">
        <h2 className="text-sm font-semibold">Connect provider pay codes to your people</h2>
        <p className="mt-2 max-w-3xl text-xs text-slate-500 leading-relaxed">Set this up once for each employee. Match the provider Pay Code (for example, 12034) to the same person&apos;s existing HRMS employee code. This keeps their HRMS code unchanged.</p>
        <ol className="my-5 grid sm:grid-cols-3 gap-4 text-xs text-slate-600"><li><span className="workflow-step mr-2">1</span>Download the CSV template</li><li><span className="workflow-step mr-2">2</span>Fill in both codes for each person</li><li><span className="workflow-step mr-2">3</span>Upload, preview, and save</li></ol>
        <div className="flex flex-wrap gap-3 items-center">
          <button type="button" onClick={downloadMappingTemplate} className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold">Download template</button>
          <input aria-label="Provider Pay Code mapping file" type="file" accept=".csv,.xls,.xlsx" onChange={event => { setMappingFile(event.target.files?.[0] ?? null); setMappingPreview(null); setConfirmReplacements(false); }} className="max-w-full text-xs" />
          <button type="button" disabled={!mappingFile || mappingBusy} onClick={() => uploadMappings("preview")} className="button-primary disabled:opacity-50">{mappingBusy ? "Processing…" : "Preview mappings"}</button>
        </div>
        {mappingPreview && <div className="mt-5 rounded-lg bg-slate-50 p-4 text-xs">
          <p>{mappingPreview.validMappings ?? 0} of {mappingPreview.totalMappings ?? 0} mappings valid.</p>
          {mappingPreview.unknownEmployeeCodes.length > 0 && <p className="mt-2 text-amber-800">HRMS employee codes not found: {mappingPreview.unknownEmployeeCodes.join(", ")}</p>}
          {!!mappingPreview.details?.length && <div className="mt-4 max-h-72 overflow-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Provider Pay Code</th><th className="p-2">HRMS code</th><th className="p-2">Employee</th><th className="p-2">Existing mapping</th></tr></thead><tbody>{mappingPreview.details.map(detail => <tr key={detail.providerCode} className="border-t border-slate-100"><td className="p-2">{detail.providerCode}</td><td className="p-2">{detail.employeeCode}</td><td className="p-2">{detail.employeeName}</td><td className={`p-2 ${detail.replaces ? "text-amber-800" : "text-slate-500"}`}>{detail.replaces || "No replacement"}</td></tr>)}</tbody></table></div>}
          {mappingPreview.details?.some(detail => detail.replaces) && <label className="mt-4 flex items-start gap-2 text-amber-900"><input type="checkbox" checked={confirmReplacements} onChange={event => setConfirmReplacements(event.target.checked)} /><span>I reviewed the existing mappings that this upload will replace.</span></label>}
          <button type="button" disabled={mappingPreview.unknownEmployeeCodes.length > 0 || mappingBusy || !mappingPreview.validMappings || (mappingPreview.details?.some(detail => detail.replaces) && !confirmReplacements)} onClick={() => uploadMappings("commit")} className="button-primary mt-4 disabled:opacity-50">Save mappings</button>
        </div>}
        <div className="mt-6 border-t border-slate-200 pt-5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">Saved mappings ({savedMappings.length})</h3><button type="button" onClick={downloadSavedMappings} disabled={!savedMappings.length} className="rounded-lg border border-slate-200 px-3 py-2 font-semibold disabled:opacity-50">Download saved mappings</button></div>
          {savedMappings.length ? <div className="mt-3 max-h-56 overflow-auto rounded-lg border border-slate-200"><table className="w-full text-left"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Provider Pay Code</th><th className="p-2">HRMS code</th><th className="p-2">Employee</th></tr></thead><tbody>{savedMappings.map(item => <tr key={item.providerCode} className="border-t border-slate-100"><td className="p-2">{item.providerCode}</td><td className="p-2">{item.employeeCode}</td><td className="p-2">{item.employeeName}</td></tr>)}</tbody></table></div> : <p className="mt-2 text-slate-500">No provider codes linked yet.</p>}
        </div>
        <p className="mt-4 text-[11px] text-slate-500">Find HRMS employee codes in People directory. After saving mappings, return to Import register and preview the file again.</p>
      </div>}

      {activeTool === "manual" && <div className="workflow-panel">
        <h2 className="text-sm font-semibold">Add or correct a daily record</h2><p className="mt-1 text-xs text-slate-500">Manual entries take priority over provider imports. Times use India Standard Time. An exit earlier than check-in is saved on the next day.</p>
        <form onSubmit={submitManual} className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="field-label">Employee<select value={form.employee_id || employees[0]?.id || ""} onChange={event => setForm({ ...form, employee_id: event.target.value })} required>{employees.length === 0 && <option value="">No employees available</option>}{employees.map(employee => <option value={employee.id} key={employee.id}>{employee.employee_code ? `${employee.employee_code} — ` : ""}{employee.display_name || `${employee.first_name} ${employee.last_name}`}</option>)}</select></label>
          <label className="field-label">Attendance date<input type="date" value={form.attendance_date} onChange={event => setForm({ ...form, attendance_date: event.target.value })} required /></label>
          <label className="field-label">Attendance status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}><option value="present">P — Present</option><option value="absent">A — Absent</option><option value="week_off">WO — Week off</option><option value="holiday">H — Holiday</option><option value="half_day">HLF — Half day</option><option value="on_leave">L — Leave</option></select></label>
          <label className="field-label">Shift code<input placeholder="For example, G11 or IGN" value={form.shift_code} onChange={event => setForm({ ...form, shift_code: event.target.value })} /></label>
          <label className="field-label">Check-in · IN1<input type="time" value={form.check_in_time} onChange={event => setForm({ ...form, check_in_time: event.target.value })} /></label>
          <label className="field-label">Check-out · Out2<input type="time" value={form.check_out_time} onChange={event => setForm({ ...form, check_out_time: event.target.value })} /></label>
          <label className="field-label">Total work · H.MM<input type="text" inputMode="decimal" placeholder="8.54 = 8h 54m" value={form.working_hours} onChange={event => setForm({ ...form, working_hours: event.target.value })} /></label>
          <label className="field-label">Overtime · H.MM<input type="text" inputMode="decimal" placeholder="1.30 = 1h 30m" value={form.overtime_hours} onChange={event => setForm({ ...form, overtime_hours: event.target.value })} /></label>
          <div className="flex items-end"><button disabled={importing || !employees.length} className="button-primary disabled:opacity-50">{importing && <Loader2 size={15} className="animate-spin" />}Save manual entry</button></div>
        </form>
      </div>}
      {message && <p role="status" aria-live="polite" className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</p>}
    </section>
  );
}
