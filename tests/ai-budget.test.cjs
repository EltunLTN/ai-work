/* eslint-disable @typescript-eslint/no-require-imports -- Isolated server-budget tests. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function setup({ allowed = true, dbError = null, env = {}, upstreamError = false } = {}) {
 const calls = [];
 const mod = { exports: {} };
 const source = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../lib/ai/budget.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
 const req = name => {
  if (name === '@supabase/supabase-js') return { createClient: () => ({ rpc: async (name, args) => { calls.push({ name, args }); return { data: allowed, error: dbError }; } }) };
  if (name === 'openai') return class { constructor(config) { this.responses = { create: async body => { calls.push({ upstream: body, config }); if (upstreamError) throw Error('timeout'); return { status: 'completed', output_text: '4' }; } }; } };
  return require(name);
 };
 vm.runInThisContext(`(function(require,module,exports,process){${source}\n})`)(req, mod, mod.exports, { env: { OPENAI_API_KEY: 'test-only', NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-only', ACTIVITY_SERVER_SECRET: 'test-only', ...env } });
 const body = { model: mod.exports.COMPLIMENTARY_MODEL, input: [{ role: 'user', content: 'İnteqral nədir? 😀' }], max_output_tokens: 2000, store: false };
 return { ...mod.exports, calls, body };
}
test('budget rejects unknown/paid models, tools, persisted context and non-text input before network', async () => {
 const g = setup();
 for (const change of [{ model: 'gpt-6.1-sol' }, { tools: [] }, { previous_response_id: 'resp_x' }, { background: true }, { service_tier: 'priority' }, { input: [{ role: 'user', content: [{ type: 'input_image', image_url: 'x' }] }] }, { max_output_tokens: 16001 }, { store: true }]) await assert.rejects(g.budgetedAI().responses.create({ ...g.body, ...change }));
 assert.equal(g.calls.length, 0);
});
test('unavailable budget or missing attestation fails closed without provider request', async () => {
 for (const config of [{ allowed: false }, { dbError: { message: 'offline' } }, { env: { ACTIVITY_SERVER_SECRET: '' } }]) {
  const g = setup(config);
  await assert.rejects(g.budgetedAI().responses.create(g.body), /Pulsuz AI/);
  assert.equal(g.calls.filter(c => c.upstream).length, 0);
 }
});
test('full UTF-8 input and reasoning/output are reserved before inference; retries disabled', async () => {
 const g = setup();
 await g.budgetedAI().responses.create(g.body);
 assert.equal(g.calls[0].name, 'reserve_ai_tokens');
 assert.ok(g.calls[0].args.token_reservation >= Buffer.byteLength(JSON.stringify(g.body)) + 2000);
 assert.equal(g.calls[1].config.maxRetries, 0);
 assert.equal(g.calls[1].upstream.service_tier, 'default');
 assert.equal(g.calls[1].upstream.model, 'gpt-5.4-mini-2026-03-17');
});
test('timeouts and aborts do not release reserved tokens or retry automatically', async () => {
 const g = setup({ upstreamError: true });
 await assert.rejects(g.budgetedAI().responses.create(g.body), /timeout/);
 assert.equal(g.calls.filter(c => c.name).length, 1);
 assert.equal(g.calls.filter(c => c.upstream).length, 1);
 const stopped = setup();
 await assert.rejects(stopped.budgetedAI().responses.create(stopped.body, { signal: AbortSignal.abort() }));
 assert.equal(stopped.calls.length, 0);
});
test('oversized context and missing output bound never reach the provider', async () => {
 const g = setup();
 for (const change of [{ input: 'x'.repeat(200000) }, { max_output_tokens: undefined }, { input: [] }]) await assert.rejects(g.budgetedAI().responses.create({ ...g.body, ...change }));
 assert.equal(g.calls.length, 0);
});
