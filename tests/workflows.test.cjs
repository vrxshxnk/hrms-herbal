/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute the real handlers and validation with only identity, notifications,
// and database I/O replaced. No credentials or live employee records are used.
function load(file, mocks, cache = new Map()) {
  const absolute = path.resolve(__dirname, "..", file);
  if (cache.has(absolute)) return cache.get(absolute);
  const loadedModule = { exports: {} };
  cache.set(absolute, loadedModule.exports);
  const source = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const localRequire = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith("@/")) return load(`${name.slice(2)}.ts`, mocks, cache);
    if (name.startsWith(".")) return load(path.relative(path.resolve(__dirname, ".."), path.resolve(path.dirname(absolute), `${name}.ts`)), mocks, cache);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports,console){${source}\n})`, { filename: absolute })(localRequire, loadedModule, loadedModule.exports, { ...console, error() {} });
  return loadedModule.exports;
}

const actorId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const leaveId = "33333333-3333-4333-8333-333333333333";
function setup({ roles = ["manager"], leave = {}, balance = 10, failDeduction = false } = {}) {
  const calls = [];
  let committed = false;
  let rolledBack = false;
  const target = { id: leaveId, employee_id: ownerId, leave_type_id: leaveId, total_days: 2, start_date: "2026-09-01", status: "Pending", manager_approval_status: "Pending", reporting_manager_id: actorId, owner_keycloak_id: "owner", leave_type_name: "Paid Leave", ...leave };
  const result = (rows) => ({ rows, rowCount: rows.length });
  const client = {
    release() {},
    async query(sql, values = []) {
      calls.push({ sql, values });
      if (sql.includes("FROM employees WHERE keycloak_id")) return result([{ id: actorId, name: "Reviewer" }]);
      if (sql.includes("WHERE lr.id = $1 FOR UPDATE")) return result([target]);
      if (sql.includes("SELECT total_leaves_avail")) return result([{ total_leaves_avail: balance, used_leaves: 0 }]);
      if (sql.includes("UPDATE employee_leave_balances")) return result(failDeduction ? [] : [{ employee_id: ownerId }]);
      if (sql.includes("UPDATE leave_requests")) return result([target]);
      if (sql.includes("UPDATE employees")) return result([{ id: actorId }]);
      if (sql.includes("INSERT INTO leave_requests")) return result([target]);
      if (sql.includes("FROM employees") && sql.includes("WHERE id = $1 LIMIT 1")) return result([{ employee_name: "Employee", reporting_manager_id: null }]);
      if (sql.includes("SELECT COUNT(*)")) return result([{ count: "1" }]);
      if (sql.includes("lr.id AS request_id")) return result([target]);
      if (sql.includes("INSERT INTO employee_leave_balances")) return result([]);
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const mocks = {
    "@/app/lib/auth/auth": { getAuthenticatedUser: async () => ({ sub: "actor", roles }) },
    "@/app/lib/api/client": {
      getPool: () => ({ connect: async () => client }),
      withTranscations: async (callback) => {
        try { const value = await callback(client); committed = true; return value; }
        catch (error) { rolledBack = true; throw error; }
      },
    },
    "@/app/lib/api/notifications": { createNotification: async () => {} },
  };
  return { calls, load: (file) => load(file, mocks), committed: () => committed, rolledBack: () => rolledBack };
}
function request(body) { return new Request("http://localhost/api/v1/leave", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }); }
async function patch(state, body = { action: "Approved" }, id = leaveId) {
  return state.load("app/api/v1/leave/[id]/route.ts").PATCH(request(body), { params: Promise.resolve({ id }) });
}

test("unrelated manager cannot approve or reject a leave", async () => {
  for (const action of ["Approved", "Rejected"]) {
    const state = setup({ leave: { reporting_manager_id: ownerId } });
    assert.equal((await patch(state, { action, rejection_reason: "Unavailable" })).status, 403);
    assert.equal(state.calls.some(({ sql }) => /^\s*UPDATE\b/.test(sql)), false);
  }
});
test("assigned manager and super manager can review team leave", async () => {
  for (const roles of [["manager"], ["SUPER_MANAGER"]]) {
    const state = setup({ roles, leave: { reporting_manager_id: ownerId, super_manager_id: actorId } });
    assert.equal((await patch(state)).status, 200);
    assert.equal(state.committed(), true);
  }
});
test("employees cannot review leave and HR cannot self-approve", async () => {
  assert.equal((await patch(setup({ roles: ["employee"] }))).status, 403);
  assert.equal((await patch(setup({ roles: ["hr_admin"], leave: { owner_keycloak_id: "actor" } }))).status, 403);
});
test("closed requests and repeated manager reviews cannot be reopened", async () => {
  for (const status of ["Withdrawn", "Rejected", "Approved"]) {
    assert.equal((await patch(setup({ leave: { status } }))).status, 409);
  }
  assert.equal((await patch(setup({ leave: { manager_approval_status: "Approved" } }))).status, 409);
});
test("HR waits for manager approval but can approve unassigned employees", async () => {
  for (const role of ["hr", "hr_admin", "hradmin", "admin", "system_admin"]) {
    assert.equal((await patch(setup({ roles: [role] }))).status, 400);
    const state = setup({ roles: [role], leave: { reporting_manager_id: null } });
    assert.equal((await patch(state)).status, 200);
    assert.equal(state.calls.filter(({ sql }) => sql.includes("used_leaves = used_leaves +")).length, 1);
  }
});
test("insufficient balances roll back and repeated HR approval does not deduct twice", async () => {
  const state = setup({ roles: ["hr"], balance: 1, leave: { reporting_manager_id: null } });
  assert.equal((await patch(state)).status, 400);
  assert.equal(state.rolledBack(), true);
  const approved = setup({ roles: ["hr"], leave: { status: "Approved", manager_approval_status: "Approved" } });
  assert.equal((await patch(approved)).status, 200);
  assert.equal(approved.calls.some(({ sql }) => sql.includes("UPDATE employee_leave_balances")), false);
});
test("owner withdrawal refunds approved leave once and rejects unrelated actors", async () => {
  const state = setup({ roles: ["employee"], leave: { status: "Approved", owner_keycloak_id: "actor" } });
  assert.equal((await patch(state, { action: "Withdrawn" })).status, 200);
  assert.equal(state.calls.filter(({ sql }) => sql.includes("GREATEST(0, used_leaves -")).length, 1);
  assert.equal((await patch(setup(), { action: "Withdrawn" })).status, 403);
});
test("invalid IDs, actions and blank rejection reasons are rejected before updates", async () => {
  assert.equal((await patch(setup(), { action: "Approved" }, "bad-id")).status, 400);
  for (const body of [{ action: "unapproved" }, { action: 10 }, { action: "Rejected", rejection_reason: " " }]) {
    assert.equal((await patch(setup(), body)).status, 400);
  }
});
test("HR list retains requests without a manager, pending reviews and history", async () => {
  const state = setup({ roles: ["hr_admin"] });
  const response = await state.load("app/api/v1/leave/route.ts").GET(new Request("http://localhost/api/v1/leave"));
  assert.equal(response.status, 200);
  const query = state.calls.find(({ sql }) => sql.includes("lr.id AS request_id"));
  assert.doesNotMatch(query.sql, /WHERE.*manager_approval_status/s);
  assert.match(query.sql, /d.name AS department/);
});
test("profile clears explicit empty fields and preserves omitted fields", async () => {
  const state = setup();
  const response = await state.load("app/api/v1/profile/route.ts").PUT(request({ personal_email: "", city: "Pune" }));
  assert.equal(response.status, 200);
  const update = state.calls.find(({ sql }) => sql.includes("UPDATE employees"));
  assert.deepEqual(update.values, [null, "Pune", actorId]);
  assert.doesNotMatch(update.sql, /mobile_number|COALESCE/);
});
test("profile rejects privileged fields, invalid image schemes and empty updates", async () => {
  for (const body of [{ system_role: "hr" }, { profile_photo_url: "javascript:alert(1)" }, { mobile_number: "" }, { marital_status: "" }, {}]) {
    const state = setup();
    assert.ok((await state.load("app/api/v1/profile/route.ts").PUT(request(body))).status >= 400);
    assert.equal(state.calls.some(({ sql }) => sql.includes("UPDATE")), false);
  }
});

test("employee edits retain omitted employment, language and role values", async () => {
  for (const role of ["hr", "hr_admin", "hradmin", "admin", "system_admin"]) {
    const state = setup({ roles: [role] });
    const response = await state.load("app/api/v1/employee/[id]/route.ts").PATCH(
      request({ reporting_manager_id: ownerId }), { params: Promise.resolve({ id: actorId }) },
    );
    assert.equal(response.status, 200);
    const update = state.calls.find(({ sql }) => /^\s*UPDATE employees/.test(sql));
    assert.deepEqual(update.values, [ownerId, actorId]);
    assert.doesNotMatch(update.sql, /system_role|employment_type|employee_category|preferred_language/);
  }
});
test("employees cannot edit employee records and empty updates are rejected", async () => {
  for (const [roles, body, expected] of [[["employee"], { first_name: "Test" }, 403], [["hr"], {}, 400]]) {
    const state = setup({ roles });
    assert.equal((await state.load("app/api/v1/employee/[id]/route.ts").PATCH(request(body), { params: Promise.resolve({ id: actorId }) })).status, expected);
  }
});
const approvedRequest = { employee_id: ownerId, leave_code: "CASUAL", start_date: "2026-09-01", end_date: "2026-09-02", total_days: 2, status: "Approved" };
test("creating approved leave deducts its balance inside the transaction", async () => {
  const state = setup({ roles: ["hr"] });
  assert.equal((await state.load("app/api/v1/leave/route.ts").POST(request(approvedRequest))).status, 200);
  assert.equal(state.committed(), true);
  assert.equal(state.calls.filter(({ sql }) => sql.includes("used_leaves = used_leaves +")).length, 1);
});
test("insufficient balance rolls back creation of already-approved leave", async () => {
  const state = setup({ roles: ["hr"], failDeduction: true });
  assert.equal((await state.load("app/api/v1/leave/route.ts").POST(request(approvedRequest))).status, 400);
  assert.equal(state.rolledBack(), true);
  assert.equal(state.committed(), false);
});
test("negative durations, impossible dates and reversed ranges are rejected", async () => {
  for (const fields of [{ total_days: -2 }, { total_days: 0 }, { start_date: "2026-02-31" }, { end_date: "2026-08-31" }, { half_day_type: "first_half" }]) {
    const state = setup({ roles: ["hr"] });
    assert.equal((await state.load("app/api/v1/leave/route.ts").POST(request({ ...approvedRequest, ...fields }))).status, 422);
    assert.equal(state.committed(), false);
  }
});
test("provider XLS and XLSX retain IN1, Out2, H.MM, overtime, shifts and P/A/WO", () => {
  const XLSX = require("xlsx");
  const { parsePerformanceRegister } = load("app/lib/attendance/provider-register.ts", {});
  const grid = [
    ["Performance Register 01/09/2026 to 30/09/2026"],
    ["", ...Array.from({ length: 30 }, (_, day) => day + 1)],
    ["Paycode, Card No. & Name", "10001 CARD001 Test Employee"],
    ["IN1", "09:00", "", ""],
    ["Out1", "12:00"], // Unused by this provider; must never become check-out.
    ["IN2", "13:00"],
    ["Out2", "18:00"],
    ["H Work", 8.54, 0, 0],
    ["OT", 1.30, 0, 0],
    ["Status", "P", "A", "WO"],
    ["Shift", "G11", "IGN", "M3"],
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(grid), "Attendance");
  for (const bookType of ["xls", "xlsx"]) {
    const result = parsePerformanceRegister(XLSX.write(workbook, { type: "array", bookType }));
    assert.equal(result.periodStart, "2026-09-01");
    assert.equal(result.rows.length, 3);
    assert.deepEqual(result.rows.map((row) => row.providerStatus), ["P", "A", "WO"]);
    assert.deepEqual(result.rows.map((row) => row.status), ["present", "absent", "week_off"]);
    assert.deepEqual(result.rows.map((row) => row.shiftCode), ["G11", "IGN", "M3"]);
    assert.equal(result.rows[0].employeeCode, "10001");
    assert.equal(result.rows[0].checkInTime, "09:00:00");
    assert.equal(result.rows[0].checkOutTime, "18:00:00");
    assert.equal(result.rows[0].workingHours, 8.9);
    assert.equal(result.rows[0].overtimeHours, 1.5);
  }
});
