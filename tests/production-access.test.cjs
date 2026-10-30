/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server boundary tests. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");

function guard({ user = { id: "student", email_confirmed_at: "2026-10-30" }, allowed = true, quotaError = null, throws = false } = {}) {
  const calls = [];
  const loadedModule = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../lib/ai-access.ts"), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mockRequire = name => {
    if (name === "next/server") return { NextResponse: Response };
    if (name === "@supabase/supabase-js") return { createClient: () => ({
      auth: { getUser: async token => { calls.push(token); if (throws) throw new Error("network"); return { data: { user }, error: null }; } },
      rpc: async name => { calls.push(name); return { data: allowed, error: quotaError }; },
    }) };
    throw new Error(name);
  };
  vm.runInThisContext(`(function(require,module,exports,process){${source}\n})`)(mockRequire, loadedModule, loadedModule.exports, {
    env: { NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co", NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable-test" },
  });
  return { check: loadedModule.exports.requireAIAccess, calls };
}
const request = (headers = {}) => new Request("https://kairo.test/api/ai/diagnostic", { method: "POST", headers });
test("unauthenticated requests never reach database or AI", async () => {
  const g = guard();
  assert.equal((await g.check(request())).status, 401);
  assert.deepEqual(g.calls, []);
});
test("oversized declared bodies are rejected before auth", async () => {
  const g = guard();
  assert.equal((await g.check(request({ "content-length": "150001" }))).status, 413);
  assert.deepEqual(g.calls, []);
});
test("unverified users cannot consume quota or invoke AI", async () => {
  const g = guard({ user: { id: "student" } });
  assert.equal((await g.check(request({ authorization: "Bearer test" }))).status, 401);
  assert.deepEqual(g.calls, ["test"]);
});
test("verified user is checked by Auth server and consumes persistent quota", async () => {
  const g = guard();
  assert.equal(await g.check(request({ authorization: "Bearer verified-token" })), null);
  assert.deepEqual(g.calls, ["verified-token", "consume_ai_quota"]);
});
test("quota and database failures fail closed", async () => {
  for (const [options, status] of [[{ allowed: false }, 429], [{ quotaError: { message: "offline" } }, 503], [{ throws: true }, 503]]) {
    const g = guard(options);
    const response = await g.check(request({ authorization: "Bearer test" }));
    assert.equal(response.status, status);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
test("all AI routes enforce access before parsing input", () => {
  const base = path.resolve(__dirname, "../app/api/ai");
  for (const folder of fs.readdirSync(base)) {
    const code = fs.readFileSync(path.join(base, folder, "route.ts"), "utf8");
    assert.match(code, /const denied = await requireAIAccess\(request\);\s*if \(denied\) return denied;/, folder);
    assert.ok(code.indexOf("requireAIAccess(request)") < code.indexOf("await request."), folder);
  }
});
