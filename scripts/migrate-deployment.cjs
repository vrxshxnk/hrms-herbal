/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS server utility. */
// Explicitly applies the attendance upgrades for an existing installation.
require("dotenv").config({ path: ".env.local", quiet: true });
const { Client } = require("pg");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

async function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--apply") {
    console.log("Usage: node scripts/migrate-deployment.cjs --apply\nBack up your database before applying migrations.");
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is missing");
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
  try {
    await client.connect();
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("SET LOCAL statement_timeout = '60s'");
    const lock = await client.query("SELECT pg_try_advisory_xact_lock(726481, 203) AS acquired");
    if (!lock.rows[0].acquired) throw new Error("Another HRMS migration is running");
    for (const file of ["002_attendance_provider_import.sql", "003_attendance_provider_mappings.sql", "004_paycode_as_employee_code.sql", "005_training_modules.sql"]) {
      await client.query(readFileSync(resolve(__dirname, "../app/database/migrations", file), "utf8"));
      console.log("Applied in transaction:", file);
    }
    await client.query("COMMIT");
    console.log("Attendance migrations committed successfully.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Attendance migrations were not committed:", error.code || "Check connectivity, permissions and database logs");
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}
main().catch(() => { console.error("DATABASE_URL is missing or migration initialization failed"); process.exitCode = 1; });
