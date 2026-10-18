/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS test runner. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const loaded = { exports: {} };
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, "../app/lib/auth/session-fetch.ts"), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInThisContext(`(function(exports){${source}\n})`)(loaded.exports);
const { createSessionFetch } = loaded.exports;

test("refresh replaces stale authorization while retaining Headers and POST body", async () => {
  let sent;
  let updates = 0;
  const session = { token: "old", async updateToken() { this.token = "fresh"; return true; } };
  const wrapped = createSessionFetch(async (input, init) => { sent = { input, init }; return new Response(); }, "https://hrms.test", session, () => updates++);
  await wrapped("/api/v1/leave", { method: "POST", body: "payload", headers: new Headers({ "Content-Type": "application/json", Authorization: "Bearer old" }) });
  assert.equal(sent.init.headers.get("Authorization"), "Bearer fresh");
  assert.equal(sent.init.headers.get("Content-Type"), "application/json");
  assert.equal(sent.init.body, "payload");
  assert.equal(sent.init.method, "POST");
  assert.equal(updates, 1);
});

test("Request headers survive and explicit tuple headers override them", async () => {
  const calls = [];
  const session = { token: "valid", updateToken: async () => false };
  const wrapped = createSessionFetch(async (input, init) => { calls.push(new Request(input, init)); return new Response(); }, "https://hrms.test", session, () => assert.fail("unnecessary state update"));
  const input = new Request("https://hrms.test/api/v1/profile", { headers: { "X-Request": "retained" } });
  await wrapped(input);
  await wrapped(input, { headers: [["X-Tuple", "override"]] });
  assert.equal(calls[0].headers.get("X-Request"), "retained");
  assert.equal(calls[1].headers.get("X-Tuple"), "override");
  assert.equal(calls[1].headers.has("X-Request"), false);
});

test("external URLs and non-API requests never receive the session token", async () => {
  const session = { token: "secret", updateToken: async () => assert.fail("unexpected refresh") };
  const wrapped = createSessionFetch(async (input, init) => { assert.equal(init, undefined); return new Response(); }, "https://hrms.test", session, () => {});
  for (const url of ["https://external.test/api/v1/data", "//external.test/api/v1/data", "/login"]) await wrapped(url);
});

test("unauthenticated requests pass through and failed refresh never sends a mutation", async () => {
  let sent = 0;
  const original = async () => { sent++; return new Response(); };
  await createSessionFetch(original, "https://hrms.test", { updateToken: async () => assert.fail("no session") }, () => {})("/api/v1/profile");
  const wrapped = createSessionFetch(original, "https://hrms.test", { token: "expired", updateToken: async () => { throw new Error("expired"); } }, () => {});
  await assert.rejects(wrapped("/api/v1/leave", { method: "POST" }), /expired/);
  assert.equal(sent, 1);
});
