"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { FileSpreadsheet, Loader2, Upload, ClipboardPenLine } from "lucide-react";

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

const providerCodeFor = (status: string) => ({
  present: "P", absent: "A", week_off: "WO", holiday: "H", half_day: "HD", on_leave: "L",
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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "", attendance_date: new Date().toISOString().slice(0, 10), status: "present",
    shift_code: "", check_in_time: "", check_out_time: "", working_hours: "0", overtime_hours: "0",
  });

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
      setPreview(data);
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

  const submitManual = async (event: FormEvent) => {
    event.preventDefault();
    const employeeId = form.employee_id || employees[0]?.id;
    if (!token || !employeeId) return;
    setImporting(true);
    setMessage(null);
    try {
      const isoTime = (time: string) => time ? `${form.attendance_date}T${time}:00.000Z` : null;
      const response = await fetch("/api/v1/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          employee_id: employeeId,
          check_in_time: isoTime(form.check_in_time),
          check_out_time: isoTime(form.check_out_time),
          working_hours: Number(form.working_hours || 0),
          overtime_hours: Number(form.overtime_hours || 0),
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
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {canImport && <section className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="flex gap-3"><FileSpreadsheet className="mt-0.5 h-5 w-5 text-blue-600" /><div>
          <h2 className="font-semibold text-slate-900">Provider Performance Register</h2>
          <p className="mt-1 text-xs text-slate-600">Import .xls/.xlsx. IN1 → in time, Out2 → out time; Out1 and IN2 are ignored.</p>
        </div></div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input aria-label="Provider attendance file" type="file" accept=".xls,.xlsx" onChange={onFileChange} className="max-w-full text-xs" />
          <button disabled={!file || importing} onClick={() => upload("preview")} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-50">Preview</button>
          <button disabled={!preview || importing} onClick={() => upload("commit")} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Upload className="h-3.5 w-3.5" />Import matched rows</button>
        </div>
        {preview && <div className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{preview.period.start} to {preview.period.end}</span>: {preview.validRows} matched daily rows across {preview.employeeCount} employees; {preview.skippedRows} blank rows skipped.
          {preview.unmatchedEmployeeCodes.length > 0 && <p className="mt-1 text-amber-700">Unmatched codes: {preview.unmatchedEmployeeCodes.join(", ")}</p>}
        </div>}
      </section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex gap-3"><ClipboardPenLine className="mt-0.5 h-5 w-5 text-emerald-600" /><div><h2 className="font-semibold text-slate-900">Manual attendance</h2><p className="mt-1 text-xs text-slate-500">Use the same status and shift conventions as the provider register.</p></div></div>
        <form onSubmit={submitManual} className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <select value={form.employee_id || employees[0]?.id || ""} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} className="col-span-2 rounded-lg border border-slate-200 px-2 py-2" required>
            {employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.employee_code ? `${employee.employee_code} — ` : ""}{employee.display_name || `${employee.first_name} ${employee.last_name}`}</option>)}
          </select>
          <input type="date" value={form.attendance_date} onChange={(e) => setForm({ ...form, attendance_date: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" required />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2"><option value="present">P — Present</option><option value="absent">A — Absent</option><option value="week_off">WO — Week off</option><option value="holiday">H — Holiday</option><option value="half_day">HD — Half day</option><option value="on_leave">L — Leave</option></select>
          <input placeholder="Shift (e.g. G11)" value={form.shift_code} onChange={(e) => setForm({ ...form, shift_code: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" />
          <div className="text-[10px] text-slate-500 pt-1">IN1 / check-in</div><div className="text-[10px] text-slate-500 pt-1">Out2 / check-out</div>
          <input aria-label="Check-in time" type="time" value={form.check_in_time} onChange={(e) => setForm({ ...form, check_in_time: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" />
          <input aria-label="Check-out time" type="time" value={form.check_out_time} onChange={(e) => setForm({ ...form, check_out_time: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" />
          <input aria-label="Working hours" type="number" min="0" max="24" step="0.01" placeholder="Work hours" value={form.working_hours} onChange={(e) => setForm({ ...form, working_hours: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" />
          <input aria-label="Overtime hours" type="number" min="0" max="24" step="0.01" placeholder="Overtime" value={form.overtime_hours} onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })} className="rounded-lg border border-slate-200 px-2 py-2" />
          <button disabled={importing || !employees.length} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Save manual entry</button>
        </form>
      </section>
      {message && <p className="xl:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">{message}</p>}
    </div>
  );
}
