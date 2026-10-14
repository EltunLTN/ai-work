/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner uses the CommonJS test harness. */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { generator } = require("./helpers/load-ai.cjs");

const sciences = ["Fizika", "Biologiya", "Coğrafiya", "Kimya"];

test("all five subjects have valid grade-specific references and direct textbook URLs", () => {
  const refs = generator().load("lib/textbook-reference.ts");
  assert.deepEqual(refs.getSubjects(), ["Riyaziyyat", ...sciences]);
  assert.equal(refs.getGrades("Riyaziyyat")[0], "1");
  for (const subject of sciences) {
    const grades = refs.getGrades(subject);
    assert.equal(grades[0], subject === "Kimya" ? "7" : "6");
    assert.equal(grades.at(-1), "11");
    for (const grade of grades) {
      for (const book of refs.getTextbooksBySelection(grade, subject)) {
        assert.ok(book.topics.length >= 4);
        assert.equal(new Set(book.topics).size, book.topics.length);
        assert.ok(book.sourceUrl.startsWith("https://e-derslik.edu.az/"));
        assert.ok(book.topics.every((topic) => topic.trim() && !/Logo|misc.xml|Ümumiləşdirici/.test(topic)));
      }
    }
  }
  const all = refs.getAllTextbookReferences();
  assert.equal(new Set(all.map((book) => book.id)).size, all.length);
});

test("switching from primary mathematics to chemistry selects grade 7 and chemistry topics", () => {
  const refs = generator().load("lib/textbook-reference.ts");
  const profile = refs.getProfileForSelection("1", "Kimya");
  assert.equal(profile.grade, "7");
  assert.equal(profile.subject, "Kimya");
  assert.equal(refs.getTextbookById(profile.textbookId).subject, "Kimya");
  assert.deepEqual(profile.selectedTopics, refs.getTextbookById(profile.textbookId).topics.slice(0, 4));
  assert.equal(refs.isSupportedSelection("1", "Fizika"), false);
  assert.equal(refs.isSupportedSelection("6", "Kimya"), false);
  assert.equal(refs.isSupportedSelection("11", "Unknown"), false);
});

for (const subject of sciences) {
  test(`${subject}: diagnostic, adaptive, plan resources and tutor all retain the selected subject`, async () => {
    const refs = generator().load("lib/textbook-reference.ts");
    const book = refs.getTextbooksBySelection("11", subject)[0];
    const topic = book.topics[0];
    const question = {
      id: "science-1", topic, difficulty: "medium", question: `${topic} üzrə anlayış və onun tətbiqi hansıdır?`,
      options: ["Birinci anlayış", "İkinci anlayış", "Üçüncü anlayış", "Dördüncü anlayış"],
      correctIndex: 2, explanation: "Bu sınaq modeli fənnin göndərilməsini və cavabın qorunmasını yoxlayır.",
    };
    for (const adaptive of [false, true]) {
      const api = generator([[question]]);
      const input = { grade: "11", subject, topics: [topic], weakTopics: [topic], level: "intermediate", count: 1 };
      const [result] = await (adaptive ? api.generateAdaptiveQuestions(input) : api.generateDiagnosticQuestions(input));
      assert.equal(result.subject, subject);
      assert.equal(result.topic, topic);
      assert.equal(result.correctIndex, 2);
      assert.equal(api.requests[0].subject, subject);
    }

    const api = generator([{
      title: `${subject} üzrə plan`, summary: `${topic} üzrə təkrar`, tips: ["Səhvləri təkrar et"],
      days: Array.from({ length: 7 }, (_, index) => ({ day: index + 1, topic, focus: topic,
        tasks: [`${topic} üzrə 15 dəqiqə təkrar`, "8 suallıq mini test"], estimatedMinutes: 40, checkpoint: index === 6 })),
    }]);
    const plan = await api.generateStudyPlan({ grade: "11", subject, curriculumTopics: book.topics,
      weakTopics: [topic], level: "intermediate", dailyMinutes: 45, targetImprovement: "Mövzunu möhkəmləndirmək" });
    assert.equal(api.requests[0].subject, subject);
    for (const day of plan.days) {
      assert.equal(day.resources[0].href, book.sourceUrl);
      assert.equal(day.resources[0].language, "az");
      assert.ok(day.resources.every((resource) => !resource.href.includes("/math/")));
      const quiz = new URL(day.resources.find((resource) => resource.kind === "test").href, "https://example.test");
      assert.equal(quiz.searchParams.get("subject"), subject);
      assert.equal(quiz.searchParams.get("grade"), "11");
      assert.equal(quiz.searchParams.get("topic"), topic);
    }

    const tutor = generator(["Fənn üzrə izah"]);
    const { parseChatInput } = tutor.load("lib/ai/chat-input.ts");
    const context = parseChatInput({ messages: [{ role: "user", content: `${topic} mövzusunu izah et` }],
      context: { grade: "11", subject, topics: [topic, "İnteqrala giriş"] } });
    assert.deepEqual(context.context.topics, [topic]);
    const reply = await tutor.generateTutorReply(context);
    assert.equal(tutor.requests[0].learningContext.subject, subject);
    assert.ok(reply.resources.length);
    assert.ok(reply.resources.every((resource) => !resource.href.includes("/math/")));
  });
}

test("wrong-grade and wrong-subject topics are rejected before any model call", async () => {
  const api = generator();
  await assert.rejects(api.generateDiagnosticQuestions({ grade: "1", subject: "Kimya", topics: ["Atomun quruluşu"], count: 1 }), /sinif/);
  await assert.rejects(api.generateDiagnosticQuestions({ grade: "11", subject: "Kimya", topics: ["İnteqrala giriş"], count: 1 }), /mövzu siyahısına/);
  assert.equal(api.requests.length, 0);
});

test("tutor history is isolated by subject and grade, including overlapping science concepts", () => {
  const { getTutorSessionKey } = generator().load("lib/tutor-session.ts");
  assert.notEqual(getTutorSessionKey({ grade: "7", subject: "Fizika" }), getTutorSessionKey({ grade: "7", subject: "Kimya" }));
  assert.notEqual(getTutorSessionKey({ grade: "7", subject: "Kimya" }), getTutorSessionKey({ grade: "11", subject: "Kimya" }));
});
