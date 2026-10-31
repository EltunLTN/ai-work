/* eslint-disable @typescript-eslint/no-require-imports -- Isolated module tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generator } = require("./helpers/load-ai.cjs");
test("admin CSV escapes spreadsheet formulas, quotes and multiline values", () => {
  const { csvCell } = generator().load("lib/admin-export.ts");
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell(' \t+123'), '"\' \t+123"');
  assert.equal(csvCell('Ad\nSoyad'), '"Ad\nSoyad"');
});
test("admin export retains real correct, wrong and unknown timing evidence", () => {
  const { attemptsCsv } = generator().load("lib/admin-export.ts");
  const text = attemptsCsv([{ submitted_at: "2026-10-31", subject: "Kimya", grade: "7", kind: "quiz", total: 8, correct: 5, duration_seconds: null }]);
  assert.ok(text.startsWith("\uFEFF"));
  assert.ok(text.includes('"8","5","3",""'));
  assert.equal(text.split("\r\n").length, 2);
});
