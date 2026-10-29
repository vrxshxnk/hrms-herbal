/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS server utility. */
// Read-only schema check. Never logs connection strings or employee data.
require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("BEGIN READ ONLY");
    const required = {
      employees: ["id", "employee_code", "keycloak_id", "reporting_manager_id", "super_manager_id", "profile_photo_url"],
      attendance_records: ["employee_id", "attendance_date", "check_in_time", "check_out_time", "working_hours", "overtime_hours", "provider_status", "shift_code", "is_manual_override", "imported_at"],
      leave_requests: ["employee_id", "leave_type_id", "status", "manager_approval_status", "manager_approved_by", "manager_action_at", "half_day_type", "approved_by", "action_taken_at", "rejection_reason"],
      employee_leave_balances: ["employee_id", "leave_type_id", "year", "total_leaves_avail", "used_leaves", "monthly_limit"],
      notifications: ["id"],
      training_modules: ["id", "code", "video_url", "duration_seconds"],
      training_schedules: ["id", "training_module_id", "department_id", "start_date"],
      employee_training_progress: ["id", "training_schedule_id", "employee_id", "watch_percent"],
    };
    const columns = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()");
    const available = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    const missing = Object.entries(required).flatMap(([table, names]) => names.filter((name) => !available.has(`${table}.${name}`)).map((name) => `${table}.${name}`));
    console.log("Missing required columns:", missing.length ? missing : "none");
    const constraints = await client.query(`SELECT conname, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint WHERE conrelid = to_regclass('leave_requests') AND contype = 'c'`);
    console.log("Leave constraints:", constraints.rows);
    const blockedWithdrawal = constraints.rows.some((row) => /\bstatus\b|\bmanager_approval_status\b/.test(row.definition) && !row.definition.includes("Withdrawn"));
    console.log("Leave withdrawal schema:", blockedWithdrawal ? "existing status constraints need to allow Withdrawn before deployment" : "no blocking check found");
    await client.query("ROLLBACK");
    if (missing.length || blockedWithdrawal) process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch((error) => {
  console.error("Deployment check failed:", error.code || "Check database configuration and connectivity");
  process.exitCode = 1;
});
