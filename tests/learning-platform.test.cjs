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
  assert.equal(resources.getLearningResources("İnteqrala giriş", "11", "Riyaziyyat").length, 3);
  assert.equal(resources.getLearningResources("İnteqrala giriş", "3", "Riyaziyyat").length, 1);
  assert.equal(resources.getLearningResources("Yeni xüsusi mövzu", "11", "Coğrafiya").length, 1);
  assert.equal(resources.getLearningResources("Atomun quruluşu", "7", "Kimya").filter(r => r.kind === "video").length, 1);
  assert.equal(resources.getLearningResources("Atomun quruluşu", "7", "Fizika").length, 1);
  for (const raw of ["javascript:alert(1)", "https://evil.example/lesson", "https://www.khanacademy.org/science/biology", "https://www.youtube.com/results?search_query=math", "https://www.youtube.com/playlist?list=123", "https://user:password@www.khanacademy.org/science/biology/v/photosynthesis"]) assert.equal(resources.allowedResourceUrl(raw, "video"), null);
  assert.ok(resources.allowedResourceUrl("https://www.youtube.com/watch?v=rfG8ce4nNh0", "video"));
});

test("web-discovered resources require an exact cited URL on an allowed provider", async () => {
  const topic = "Hüceyrənin ümumi quruluşu";
  const good = "https://www.khanacademy.org/science/biology/v/test-specific-cell-lesson";
  const uncited = "https://www.khanacademy.org/science/biology/a/not-cited";
  const api = generator([{ __response: {
    status: "completed", output_text: JSON.stringify({ items: [{ topic, resources: [
      { kind: "video", href: good, title: "Cell structure", provider: "Khan Academy", language: "en" },
      { kind: "material", href: uncited, title: "Uncited", provider: "Khan Academy", language: "en" },
      { kind: "material", href: "https://evil.example/page", title: "Untrusted", provider: "Wrong", language: "en" },
    ] }] }), output: [{ type: "message", content: [{ type: "output_text", annotations: [{ type: "url_citation", url: good }, { type: "url_citation", url: "https://evil.example/page" }] }] }],
  } }], { ENABLE_RESOURCE_SEARCH: "true" });
  const { verifiedTopicResources } = api.load("lib/ai/resource-search.ts");
  const result = (await verifiedTopicResources([topic], "6", "Biologiya")).get(topic);
  assert.ok(result.some(r => r.href === good));
  assert.ok(result.every(r => r.href !== uncited && !r.href.includes("evil.example")));
  assert.equal(result.filter(r => r.kind === "test").length, 1);
});

test("stronger model preserves validated JSON contracts without unsupported temperature", async () => {
  const q = { topic: "İnteqrala giriş", question: "∫ 2x dx nədir?", options: ["x² + C", "2x + C", "x + C", "2 + C"], correctIndex: 0, explanation: "x² funksiyasının törəməsi 2x-dir.", difficulty: "medium" };
  const api = generator([[q]]);
  await api.generateDiagnosticQuestions({ grade: "11", subject: "Riyaziyyat", topics: [q.topic], count: 1 });
  assert.equal(api.rawRequests[0].model, "gpt-6.1-sol");
  assert.equal(api.rawRequests[0].reasoning.effort, "medium");
  assert.equal(api.rawRequests[0].temperature, undefined);
  assert.equal(api.rawRequests[0].store, false);
  assert.equal(api.rawRequests[0].text.format.type, "json_object");
});

test("resource grounding accepts retrieved API sources when JSON has no inline citations", async () => {
  const topic = "İzotoplar və ionlar";
  const href = "https://www.khanacademy.org/science/chemistry/atomic-structure/v/isotopes-and-ions";
  const api = generator([{ __response: { status: "completed", output_text: JSON.stringify({ items: [{ topic, resources: [{ kind: "video", href, title: "Isotopes and ions", provider: "Khan Academy", language: "en" }] }] }), output: [{ type: "web_search_call", action: { type: "search", sources: [{ type: "url", url: href }] } }] } }], { ENABLE_RESOURCE_SEARCH: "true" });
  const { verifiedTopicResources } = api.load("lib/ai/resource-search.ts");
  const result = (await verifiedTopicResources([topic], "7", "Kimya")).get(topic);
  assert.ok(result.some(resource => resource.href === href));
  assert.equal(api.rawRequests[0].tool_choice, "required");
  assert.ok(api.rawRequests[0].include.includes("web_search_call.action.sources"));
});
