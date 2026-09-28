import * as XLSX from "xlsx";

export interface ProviderAttendanceRow {
  employeeCode: string;
  employeeName: string | null;
  attendanceDate: string;
  providerStatus: string | null;
  status: string;
  shiftCode: string | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number;
  overtimeHours: number;
}

export interface ProviderRegisterParseResult {
  periodStart: string;
  periodEnd: string;
  rows: ProviderAttendanceRow[];
  employeeCodes: string[];
  skippedRows: number;
}

const ANCHOR_LABEL = "paycode, card no. & name";
const METRIC_LABELS = ["in1", "out1", "in2", "out2", "h work", "ot", "status", "shift"];

function clean(value: unknown): string {
  return String(value ?? "").replace(/\u00a0/g, " ").trim();
}

function parseDate(value: string): Date | null {
  const match = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!match) return null;
  const [, day, month, yearValue] = match;
  const year = yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue);
  const date = new Date(Date.UTC(year, Number(month) - 1, Number(day)));
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseTime(value: string): string | null {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  const meridiem = match[4]?.toUpperCase();
  if (meridiem === "PM" && hours < 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseHours(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseFloat(clean(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeProviderStatus(providerStatus: string | null): string {
  const code = clean(providerStatus).toUpperCase();
  if (code === "P") return "present";
  if (code === "A") return "absent";
  if (["WO", "W/O", "OFF"].includes(code)) return "week_off";
  if (["H", "HOL", "HOLIDAY"].includes(code)) return "holiday";
  if (["HD", "HLF", "HALF"].includes(code)) return "half_day";
  if (["L", "CL", "SL", "PL", "EL", "ML"].includes(code)) return "on_leave";
  return code ? "provider_unknown" : "absent";
}

function getCellText(sheet: XLSX.WorkSheet, row: number, column: number): string {
  const address = XLSX.utils.encode_cell({ r: row, c: column });
  const cell = sheet[address];
  return clean(cell?.w ?? cell?.v);
}

function getCellValue(sheet: XLSX.WorkSheet, row: number, column: number): unknown {
  return sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v;
}

function findDayColumns(sheet: XLSX.WorkSheet, range: XLSX.Range): { column: number; day: number }[] {
  let best: { column: number; day: number }[] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const candidate: { column: number; day: number }[] = [];
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const day = Number(getCellText(sheet, row, column));
      if (Number.isInteger(day) && day >= 1 && day <= 31) candidate.push({ column, day });
      else if (candidate.length >= 20) break;
      else candidate.length = 0;
    }
    if (candidate.length > best.length) best = candidate;
  }
  if (best.length < 20) throw new Error("Could not find the provider's day-of-month header row.");
  return best;
}

function findPeriod(sheet: XLSX.WorkSheet, range: XLSX.Range): { start: Date; end: Date } {
  for (let row = range.s.r; row <= Math.min(range.s.r + 10, range.e.r); row += 1) {
    const text = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) =>
      getCellText(sheet, row, range.s.c + index),
    ).join(" ");
    const dates = [...text.matchAll(/\d{1,2}\/\d{1,2}\/\d{2,4}/g)].map((match) => parseDate(match[0]));
    if (dates.length >= 2 && dates[0] && dates[1]) return { start: dates[0], end: dates[1] };
  }
  throw new Error("Could not find the report period in the workbook header.");
}

function findMetricRows(sheet: XLSX.WorkSheet, startRow: number, endRow: number, range: XLSX.Range) {
  const metrics = new Map<string, number>();
  for (let row = startRow + 1; row < endRow; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const label = getCellText(sheet, row, column).toLowerCase();
      const metric = METRIC_LABELS.find((item) => label === item);
      if (metric && !metrics.has(metric)) metrics.set(metric, row);
    }
  }
  return metrics;
}

function employeeIdentity(sheet: XLSX.WorkSheet, row: number, range: XLSX.Range) {
  for (let column = range.s.c + 1; column <= range.e.c; column += 1) {
    const match = getCellText(sheet, row, column).match(/^([^\s]+)\s+\S+\s+(.+)$/);
    if (match) return { employeeCode: match[1], employeeName: clean(match[2]) || null };
  }
  return null;
}

/** Parses repeated provider employee blocks; labels, not absolute row numbers, drive the mapping. */
export function parsePerformanceRegister(buffer: ArrayBuffer): ProviderRegisterParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet?.["!ref"]) throw new Error("The workbook is empty.");
  const range = XLSX.utils.decode_range(sheet["!ref"]);
  const { start, end } = findPeriod(sheet, range);
  const dayColumns = findDayColumns(sheet, range);
  const anchors: number[] = [];
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    if (Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) =>
      getCellText(sheet, row, range.s.c + index).toLowerCase() === ANCHOR_LABEL,
    ).some(Boolean)) anchors.push(row);
  }
  if (!anchors.length) throw new Error("No employee attendance blocks were found.");

  const rows: ProviderAttendanceRow[] = [];
  let skippedRows = 0;
  anchors.forEach((anchorRow, index) => {
    const identity = employeeIdentity(sheet, anchorRow, range);
    if (!identity) {
      skippedRows += dayColumns.length;
      return;
    }
    const metrics = findMetricRows(sheet, anchorRow, anchors[index + 1] ?? range.e.r + 1, range);
    dayColumns.forEach(({ column, day }) => {
      const providerStatus = getCellText(sheet, metrics.get("status") ?? -1, column) || null;
      const shiftCode = getCellText(sheet, metrics.get("shift") ?? -1, column) || null;
      const inTime = getCellText(sheet, metrics.get("in1") ?? -1, column);
      const outTime = getCellText(sheet, metrics.get("out2") ?? -1, column);
      const hours = getCellValue(sheet, metrics.get("h work") ?? -1, column);
      const overtime = getCellValue(sheet, metrics.get("ot") ?? -1, column);
      if (!providerStatus && !shiftCode && !inTime && !outTime && !clean(hours) && !clean(overtime)) {
        skippedRows += 1;
        return;
      }
      const date = new Date(start);
      date.setUTCDate(day);
      rows.push({
        ...identity,
        attendanceDate: toIsoDate(date),
        providerStatus,
        status: normalizeProviderStatus(providerStatus),
        shiftCode,
        checkInTime: parseTime(inTime),
        // Out1 and IN2 are intentionally ignored because they are unused in this provider export.
        checkOutTime: parseTime(outTime),
        workingHours: parseHours(hours),
        overtimeHours: parseHours(overtime),
      });
    });
  });
  return {
    periodStart: toIsoDate(start),
    periodEnd: toIsoDate(end),
    rows,
    employeeCodes: [...new Set(rows.map((row) => row.employeeCode))].sort(),
    skippedRows,
  };
}
