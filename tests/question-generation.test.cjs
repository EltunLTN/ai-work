/* eslint-disable @typescript-eslint/no-require-imports -- This harness loads CommonJS-transpiled TypeScript with a mocked SDK. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the production generator with controlled model responses, without API calls.
function generator(batches) {
  const requests = [];
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule.exports);
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    }).outputText;
    const localRequire = (name) => {
      if (name === "openai") return class {
        responses = { create: async (request) => {
          requests.push(JSON.parse(request.input[1].content));
          const batch = batches.shift() ?? [];
          return { output_text: typeof batch === "string" ? batch : JSON.stringify({ questions: batch }) };
        } };
      };
      if (name.startsWith("@/")) return load(path.resolve(__dirname, "..", `${name.slice(2)}.ts`));
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports,process){${code}\n})`, { filename: file })(
      localRequire, loadedModule, loadedModule.exports, { env: { OPENAI_API_KEY: "test-only" } },
    );
    return loadedModule.exports;
  }
  return { ...load(path.resolve(__dirname, "../lib/ai/client.ts")), requests };
}

const input = { grade: "11", subject: "Riyaziyyat", topics: ["İnteqrala giriş"], count: 2 };
function integral(n, overrides = {}) {
  return {
    id: `integral-${n}`, topic: "İnteqrala giriş", difficulty: "medium",
    question: `∫ ${n}x dx inteqralını tapın.`,
    options: [`${n / 2}x^2 + C`, `${n}x + C`, `${n}x^2 + C`, "C"],
    correctIndex: 0, explanation: `Qüvvət qaydası ilə nəticə ${n / 2}x^2 + C-dir.`,
    ...overrides,
  };
}

test("short diagnostic output is topped up with integrals at the same grade", async () => {
  const api = generator([[integral(2)], [integral(4)]]);
  const result = await api.generateDiagnosticQuestions(input);
  assert.equal(result.length, 2);
  assert.ok(result.every((q) => q.grade === "11" && q.topic === "İnteqrala giriş" && q.question.includes("∫")));
  assert.equal(api.requests[1].count, 1);
  assert.equal(api.requests[1].grade, "11");
  assert.deepEqual(api.requests[1].topics, input.topics);
  assert.ok(api.requests[1].excludedQuestionStems.includes(integral(2).question));
});

test("adaptive beginner questions retain grade and weak topic on retry", async () => {
  const api = generator([[integral(2)], [integral(4)]]);
  const result = await api.generateAdaptiveQuestions({ ...input, weakTopics: input.topics, level: "beginner" });
  assert.equal(result.length, 2);
  assert.equal(api.requests[1].level, "beginner");
  assert.deepEqual(api.requests[1].weakTopics, input.topics);
  assert.equal(api.requests[1].grade, "11");
});

test("wrong topics and malformed answers are regenerated instead of replaced by arithmetic", async () => {
  const api = generator([[
    integral(2, { topic: "Toplama və çıxma" }),
    integral(4, { correctIndex: 1.5 }),
    integral(6, { options: ["1", "1", "2", "3"] }),
    integral(8, { correctIndex: undefined }),
  ], [integral(10), integral(12)]]);
  const result = await api.generateDiagnosticQuestions(input);
  assert.deepEqual(result.map((q) => q.question), [integral(10).question, integral(12).question]);
});

test("retries preserve topic balance and reject history and batch duplicates", async () => {
  const derivative = integral(8, { topic: "Törəmə", question: "x^3 funksiyasının törəməsini tapın." });
  const api = generator([[integral(2), integral(4), integral(4)], [integral(4), derivative]]);
  const result = await api.generateDiagnosticQuestions({ ...input, topics: ["İnteqrala giriş", "Törəmə"], excludedQuestionStems: [integral(2).question] });
  assert.deepEqual(result.map((q) => q.topic), ["İnteqrala giriş", "Törəmə"]);
  assert.deepEqual(api.requests[1].topicCounts, [{ topic: "Törəmə", count: 1 }]);
});

test("unusable output fails after bounded retries without fabricated fallback questions", async () => {
  const api = generator(["invalid JSON", [], [integral(2, { options: [] })]]);
  await assert.rejects(api.generateDiagnosticQuestions(input), /Yenidən cəhd edin/);
  assert.equal(api.requests.length, 3);
});

test("calculus wording and symbolic explanations do not overwrite correct answer", async () => {
  const question = integral(2, {
    question: "0 və 1 sərhədləri arasında ∫ x dx və ∫ 2x dx inteqrallarının cəmi neçədir?",
    options: ["1", "1.5", "2", "3"], correctIndex: 1,
    explanation: "F(x) = x^2/2 + x^2; yuxarı sərhəddə 1.5 alınır.",
  });
  const api = generator([[question]]);
  const [result] = await api.generateDiagnosticQuestions({ ...input, count: 1 });
  assert.equal(result.correctIndex, 1);
  assert.equal(result.explanation, question.explanation);
});
