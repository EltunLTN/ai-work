/* eslint-disable @typescript-eslint/no-require-imports -- Isolated production module tests. */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { generator } = require("./helpers/load-ai.cjs");

test("practice rows preserve subject, topic evidence, missing historical time and immutable attempt IDs", () => {
  const { practiceRows } = generator().load("lib/practice-data.ts");
  const rows = practiceRows("owner", [{ subject: "Fizika", grade: "8", totalQuestions: 4, totalCorrect: 3, topicScores: [{ topic: "Om qanunu", total: 4, correct: 3 }], submittedAt: "2026-10-30T12:00:00Z" }], [{ id: "mini-1", subject: "Kimya", grade: "7", topic: "Atomun quruluşu", total: 8, correct: 5, durationSeconds: 141.6, submittedAt: "2026-10-30T13:00:00Z" }]);
  assert.equal(rows[0].duration_seconds, null);
  assert.equal(rows[0].subject, "Fizika");
  assert.equal(rows[1].duration_seconds, 142);
  assert.equal(rows[1].topic_scores[0].total, 8);
  assert.equal(rows[1].topic_scores[0].correct, 5);
  assert.deepEqual(practiceRows("owner", [], [{ id: "bad", grade: "7", total: 1, correct: 5, submittedAt: "not-a-date" }]), []);
  assert.equal(practiceRows("owner", [], [{ id: "mini-1", subject: "Kimya", grade: "7", topic: "Atom", total: 8, correct: 5, submittedAt: "2026-10-30T13:00:00Z" }])[0].attempt_id, rows[1].attempt_id);
});

test("resource catalog is subject-specific, handles Azerbaijani case and never substitutes a generic homepage", () => {
  const resources = generator().load("lib/learning-resources.ts");
  assert.equal(resources.getLearningResources("İnteqral", "11", "Riyaziyyat").length, 3);
  assert.equal(resources.getLearningResources("İnteqral", "3", "Riyaziyyat").length, 1);
  assert.equal(resources.getLearningResources("Yeni xüsusi mövzu", "11", "Coğrafiya").length, 1);
  assert.equal(resources.getLearningResources("Atomun quruluşu", "7", "Kimya").filter(r => r.kind === "video").length, 1);
  assert.equal(resources.getLearningResources("Atomun quruluşu", "7", "Fizika").length, 1);
  for (const raw of ["javascript:alert(1)", "https://evil.example/lesson", "https://www.khanacademy.org/science/biology", "https://www.youtube.com/results?search_query=math", "https://www.youtube.com/playlist?list=123", "https://user:password@www.khanacademy.org/science/biology/v/photosynthesis"]) assert.equal(resources.allowedResourceUrl(raw, "video"), null);
  assert.ok(resources.allowedResourceUrl("https://www.youtube.com/watch?v=rfG8ce4nNh0", "video"));
});

test("paid discovery is never called even with the old search flag enabled", async () => {
 const api = generator([], { ENABLE_RESOURCE_SEARCH: "true" });
 const { verifiedTopicResources } = api.load("lib/ai/resource-search.ts");
 const result = (await verifiedTopicResources(["İnteqral"], "11", "Riyaziyyat")).get("İnteqral");
 assert.ok(result.some(r => r.href.includes("IndefiniteIntegrals.aspx")));
 assert.equal(api.rawRequests.length, 0);
});

test("stronger model preserves validated JSON contracts without unsupported temperature", async () => {
  const q = { topic: "İnteqral", question: "∫ 2x dx nədir?", options: ["x² + C", "2x + C", "x + C", "2 + C"], correctIndex: 0, explanation: "x² funksiyasının törəməsi 2x-dir.", difficulty: "medium" };
  const api = generator([[q]]);
  await api.generateDiagnosticQuestions({ grade: "11", subject: "Riyaziyyat", topics: [q.topic], count: 1 });
  assert.equal(api.rawRequests[0].model, "gpt-5.4-mini-2026-03-17");
  assert.equal(api.rawRequests[0].reasoning.effort, "medium");
  assert.equal(api.rawRequests[0].temperature, undefined);
  assert.equal(api.rawRequests[0].store, false);
  assert.equal(api.rawRequests[0].text.format.type, "json_object");
});


