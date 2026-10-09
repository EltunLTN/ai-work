import OpenAI from "openai";
import {
  ADAPTIVE_QUESTION_PROMPT,
  DIAGNOSTIC_QUESTION_PROMPT,
  FEEDBACK_SUMMARY_PROMPT,
  STUDY_PLAN_PROMPT,
} from "@/lib/ai/prompts";
import {
  FALLBACK_FEEDBACK,
  getFallbackQuestions,
} from "@/lib/constants";
import { parseJsonSafe } from "@/lib/utils";
import type {
  DiagnosticResult,
  FeedbackSummary,
  Grade,
  Question,
  StudentLevel,
  StudyPlan,
  Subject,
  Topic,
} from "@/lib/types";

const MODEL = "gpt-4.1-mini";

function normalizeQuestionStem(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

function uniqueByStem(questions: Question[], excludedStems: string[]): Question[] {
  const seen = new Set(excludedStems.map(normalizeQuestionStem));
  const unique: Question[] = [];

  for (const q of questions) {
    const stem = normalizeQuestionStem(q.question);
    if (!stem || seen.has(stem)) continue;
    seen.add(stem);
    unique.push(q);
  }

  return unique;
}

function toMathExpr(raw: string): string {
  const superscriptMap: Record<string, string> = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
  };

  const normalizedSuperscripts = raw.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (ch) => superscriptMap[ch] ?? ch);

  return normalizedSuperscripts
    .replace(/[−–]/g, "-")
    .replace(/×/g, "*")
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/x([0-9])(?![0-9])/gi, "x^$1")
    .replace(/(\d)x/gi, "$1*x")
    .replace(/\)x/gi, ")*x")
    .replace(/\^/g, "**");
}

function safeEvalExpr(expr: string, x: number): number | null {
  const cleaned = toMathExpr(expr);
  if (!/^[0-9xX+\-*/().*]+$/.test(cleaned)) return null;

  try {
    const fn = new Function("x", `return (${cleaned});`) as (x: number) => number;
    const value = fn(x);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function extractFunctionExpr(question: string): string | null {
  const match = question.match(/f\(x\)\s*=\s*([^?]+?)(?:funksiyas|function|törəm|derivative)/i);
  return match?.[1]?.trim() ?? null;
}

function numericDerivative(fnExpr: string, x: number): number | null {
  const h = 1e-4;
  const left = safeEvalExpr(fnExpr, x - h);
  const right = safeEvalExpr(fnExpr, x + h);
  if (left === null || right === null) return null;
  return (right - left) / (2 * h);
}

function extractDerivativeEvaluationPoint(questionText: string): number | null {
  const pointMatch = questionText.match(/x\s*=\s*([\-\d.,Il]+)/i);
  if (!pointMatch?.[1]) return null;

  const token = pointMatch[1].trim();
  if (/^[Il]$/i.test(token)) return 1;

  const numeric = Number(token.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

function optionNumericAtPoint(option: string, x: number): number | null {
  const fromExpr = safeEvalExpr(option, x);
  if (fromExpr !== null) return fromExpr;
  return parseNumericToken(option);
}

function findOptionIndexForDerivativeAtPoint(options: string[], expected: number, x: number): number | null {
  const epsilon = 0.15;
  const matched = options
    .map((option, index) => ({ index, value: optionNumericAtPoint(option, x) }))
    .filter((item) => item.value !== null && Math.abs((item.value as number) - expected) <= epsilon)
    .map((item) => item.index);

  return matched.length === 1 ? matched[0] : null;
}

function detectCorrectOptionForDerivative(question: Question): number | null {
  const text = question.question.toLowerCase();
  if (!text.includes("törəmə") && !text.includes("derivative")) return null;

  const fnExpr = extractFunctionExpr(question.question);
  if (!fnExpr) return null;

  const point = extractDerivativeEvaluationPoint(question.question);
  if (point !== null) {
    const expectedAtPoint = numericDerivative(fnExpr, point);
    if (expectedAtPoint === null) return null;

    return findOptionIndexForDerivativeAtPoint(question.options, expectedAtPoint, point);
  }

  const sampleXs = [0, 1, 2, 3, 4];
  const matched = question.options
    .map((option, optionIndex) => {
      for (const x of sampleXs) {
        const expected = numericDerivative(fnExpr, x);
        const actual = safeEvalExpr(option, x);
        if (expected === null || actual === null) return null;
        if (Math.abs(expected - actual) > 0.15) return null;
      }
      return optionIndex;
    })
    .filter((value): value is number => value !== null);

  if (matched.length === 1) return matched[0];
  return null;
}

function parseCoefficient(value: string): number {
  if (value === "" || value === "+") return 1;
  if (value === "-") return -1;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildDerivativeExprFromPolynomial(fnExpr: string): string | null {
  const cleaned = toMathExpr(fnExpr)
    .replace(/\*\*/g, "^")
    .replace(/\*/g, "")
    .replace(/\s+/g, "");

  if (!cleaned) return null;

  const signed = cleaned.startsWith("-") || cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
  const terms = signed.match(/[+-][^+-]+/g);
  if (!terms?.length) return null;

  const byPower = new Map<number, number>();

  for (const term of terms) {
    const powerMatch = term.match(/^([+-]?\d*\.?\d*)x\^(\d+)$/i);
    if (powerMatch) {
      const coeff = parseCoefficient(powerMatch[1]);
      const power = Number(powerMatch[2]);
      byPower.set(power, (byPower.get(power) ?? 0) + coeff);
      continue;
    }

    const linearMatch = term.match(/^([+-]?\d*\.?\d*)x$/i);
    if (linearMatch) {
      const coeff = parseCoefficient(linearMatch[1]);
      byPower.set(1, (byPower.get(1) ?? 0) + coeff);
      continue;
    }

    const constantMatch = term.match(/^([+-]?\d*\.?\d+)$/);
    if (constantMatch) {
      byPower.set(0, (byPower.get(0) ?? 0) + Number(constantMatch[1]));
      continue;
    }

    return null;
  }

  const derivedByPower = new Map<number, number>();
  for (const [power, coeff] of byPower.entries()) {
    if (power <= 0) continue;
    const nextPower = power - 1;
    const nextCoeff = coeff * power;
    derivedByPower.set(nextPower, (derivedByPower.get(nextPower) ?? 0) + nextCoeff);
  }

  const ordered = [...derivedByPower.entries()]
    .filter(([, coeff]) => Math.abs(coeff) > 1e-9)
    .sort((a, b) => b[0] - a[0]);

  if (!ordered.length) return "0";

  const chunks = ordered.map(([power, coeff], index) => {
    const absCoeff = Math.abs(coeff);
    const sign = coeff < 0 ? "-" : index === 0 ? "" : "+";

    if (power === 0) return `${sign}${absCoeff}`;
    if (power === 1) {
      const c = absCoeff === 1 ? "" : `${absCoeff}`;
      return `${sign}${c}x`;
    }
    const c = absCoeff === 1 ? "" : `${absCoeff}`;
    return `${sign}${c}x^${power}`;
  });

  return chunks.join("");
}

function isDerivativeQuestion(question: Question): boolean {
  const text = question.question.toLowerCase();
  return text.includes("törəmə") || text.includes("derivative");
}

function expressionsEquivalent(exprA: string, exprB: string): boolean {
  const xs = [0, 1, 2, 3, 4];
  for (const x of xs) {
    const a = safeEvalExpr(exprA, x);
    const b = safeEvalExpr(exprB, x);
    if (a === null || b === null) return false;
    if (Math.abs(a - b) > 0.15) return false;
  }
  return true;
}

function repairDerivativeQuestion(question: Question): Question | null {
  if (!isDerivativeQuestion(question)) return null;

  const fnExpr = extractFunctionExpr(question.question);
  if (!fnExpr) return null;

  const point = extractDerivativeEvaluationPoint(question.question);
  if (point !== null) {
    const expectedAtPoint = numericDerivative(fnExpr, point);
    if (expectedAtPoint === null) return null;

    const existingIndex = findOptionIndexForDerivativeAtPoint(question.options, expectedAtPoint, point);
    if (existingIndex !== null) {
      return {
        ...question,
        correctIndex: existingIndex,
        explanation: `Yoxlanmış cavab: f'(${point}) = ${expectedAtPoint}. ${question.explanation}`,
      };
    }

    const repairedOptions = [...question.options];
    const roundedValue = Math.abs(expectedAtPoint - Math.round(expectedAtPoint)) < 1e-9
      ? String(Math.round(expectedAtPoint))
      : String(Number(expectedAtPoint.toFixed(2)));
    repairedOptions[3] = roundedValue;

    return {
      ...question,
      options: repairedOptions,
      correctIndex: 3,
      explanation: `Variant düzəldildi: f'(${point}) = ${roundedValue}. ${question.explanation}`,
    };
  }

  const expectedExpr = buildDerivativeExprFromPolynomial(fnExpr);
  if (!expectedExpr) return null;

  const existingIndex = question.options.findIndex((option) => expressionsEquivalent(option, expectedExpr));
  if (existingIndex >= 0) {
    return {
      ...question,
      correctIndex: existingIndex,
      explanation: `Yoxlanmış cavab: f'(x) = ${expectedExpr}. ${question.explanation}`,
    };
  }

  const repairedOptions = [...question.options];
  repairedOptions[3] = expectedExpr;

  return {
    ...question,
    options: repairedOptions,
    correctIndex: 3,
    explanation: `Variant düzəldildi: f'(x) = ${expectedExpr}. ${question.explanation}`,
  };
}

function parseNumericToken(value: string): number | null {
  const normalized = value.trim().replace(/,/g, ".");
  const fractionMatch = normalized.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
    return numerator / denominator;
  }

  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function findOptionIndexByNumericValue(options: string[], expected: number): number | null {
  const epsilon = 1e-6;
  const matched = options
    .map((option, index) => ({ index, value: parseNumericToken(option) }))
    .filter((item) => item.value !== null && Math.abs((item.value as number) - expected) < epsilon)
    .map((item) => item.index);

  return matched.length === 1 ? matched[0] : null;
}

function inferExpectedFromArithmeticQuestion(questionText: string): number | null {
  const lower = questionText.toLowerCase();
  const numbers = (questionText.match(/-?\d+(?:[\.,]\d+)?/g) ?? []).map((item) => Number(item.replace(",", ".")));
  if (numbers.length < 2 || numbers.some((n) => !Number.isFinite(n))) return null;

  if (lower.includes("ümumilikdə") || lower.includes("cəmi") || lower.includes("toplam")) {
    return numbers.reduce((sum, n) => sum + n, 0);
  }

  if (lower.includes("qaldı") || lower.includes("fərq") || lower.includes("çıx")) {
    return numbers[0] - numbers[1];
  }

  if (lower.includes("hər") && (lower.includes("cəmi") || lower.includes("ümumi"))) {
    return numbers[0] * numbers[1];
  }

  return null;
}

function inferExpectedFromExplanation(explanation: string): number | null {
  const equalityPart = explanation.split("=").pop();
  if (!equalityPart) return null;
  return parseNumericToken(equalityPart);
}

function validateAndRepairQuestions(grade: Grade, subject: Subject, questions: Question[]): Question[] {
  return questions.map((question, index) => {
    const hasValidShape =
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      typeof question.correctIndex === "number" &&
      question.correctIndex >= 0 &&
      question.correctIndex <= 3;

    if (!hasValidShape) {
      const fallback = getFallbackQuestions({
        grade,
        subject,
        topics: [question.topic || "Ümumi mövzu"],
        count: 1,
      })[0];
      return { ...fallback, id: question.id || fallback.id || `fb-${index + 1}` };
    }

    const repairedDerivativeIndex = detectCorrectOptionForDerivative(question);
    if (repairedDerivativeIndex !== null) {
      return {
        ...question,
        correctIndex: repairedDerivativeIndex,
      };
    }

    const repairedDerivativeQuestion = repairDerivativeQuestion(question);
    if (repairedDerivativeQuestion) {
      return repairedDerivativeQuestion;
    }

    const expectedFromQuestion = inferExpectedFromArithmeticQuestion(question.question);
    if (expectedFromQuestion !== null) {
      const indexFromQuestion = findOptionIndexByNumericValue(question.options, expectedFromQuestion);
      if (indexFromQuestion !== null) {
        return {
          ...question,
          correctIndex: indexFromQuestion,
          explanation: `${question.explanation} Yoxlama: düzgün nəticə ${expectedFromQuestion}.`,
        };
      }

      const fallback = getFallbackQuestions({
        grade,
        subject,
        topics: [question.topic || "Ümumi mövzu"],
        count: 1,
      })[0];
      return { ...fallback, id: question.id || fallback.id || `fb-${index + 1}` };
    }

    const expectedFromExplanation = inferExpectedFromExplanation(question.explanation);
    if (expectedFromExplanation !== null) {
      const indexFromExplanation = findOptionIndexByNumericValue(question.options, expectedFromExplanation);
      if (indexFromExplanation !== null) {
        return {
          ...question,
          correctIndex: indexFromExplanation,
        };
      }
    }

    return question;
  });
}

function client() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY təyin edilməyib.");
  }
  return new OpenAI({ apiKey: key });
}

function normalizeQuestions(
  grade: Grade,
  subject: Subject,
  parsed: { questions?: Question[] } | Question[] | null,
): Question[] {
  const rawQuestions = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.questions)
      ? parsed.questions
      : [];

  if (!rawQuestions.length) return [];

  return rawQuestions
    .filter((q) => Array.isArray(q?.options) && q.options.length === 4 && typeof q?.question === "string")
    .map((q, index) => ({
      ...q,
      id: q.id || `ai-${subject}-${Date.now()}-${index + 1}`,
      grade,
      subject,
      topic: q.topic || "Ümumi mövzu",
      difficulty: q.difficulty || "medium",
      explanation: q.explanation || "Bu sual mövzu üzrə əsas qaydanı yoxlayır.",
      correctIndex:
        typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
          ? q.correctIndex
          : Number(q.correctIndex) >= 0 && Number(q.correctIndex) <= 3
            ? Number(q.correctIndex)
            : 0,
    }));
}

export async function generateDiagnosticQuestions(input: {
  grade: Grade;
  subject: Subject;
  topics: Topic[];
  level?: StudentLevel;
  count?: number;
  excludedQuestionStems?: string[];
}): Promise<Question[]> {
  const desiredCount = input.count ?? Math.max(6, input.topics.length);
  const openai = client();

  try {
    const response = await openai.responses.create({
      model: MODEL,
      temperature: 0.85,
      input: [
        { role: "system", content: DIAGNOSTIC_QUESTION_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            grade: input.grade,
            subject: input.subject,
            topics: input.topics,
            level: input.level ?? "intermediate",
            count: desiredCount,
            nonce: Date.now(),
            instruction: "Mövzu sayı qədər sual ver və mövzuları balanslı payla.",
            excludedQuestionStems: input.excludedQuestionStems?.slice(-80) ?? [],
            noveltyRule: "excludedQuestionStems daxilində olan sualları və eyni kökdə sualları təkrarlama.",
          }),
        },
      ],
    });

    const parsed = parseJsonSafe<{ questions?: Question[] } | Question[]>(response.output_text);
    const questions = validateAndRepairQuestions(
      input.grade,
      input.subject,
      normalizeQuestions(input.grade, input.subject, parsed),
    );
    const uniqueQuestions = uniqueByStem(questions, input.excludedQuestionStems ?? []);
    if (!uniqueQuestions.length) {
      throw new Error("AI valid sual JSON-u qaytarmadı.");
    }
    if (uniqueQuestions.length >= desiredCount) {
      return uniqueQuestions.slice(0, desiredCount);
    }

    const fallback = getFallbackQuestions({
      grade: input.grade,
      subject: input.subject,
      topics: input.topics,
      count: desiredCount * 2,
    });
    const toppedUp = uniqueByStem([...uniqueQuestions, ...fallback], input.excludedQuestionStems ?? []);
    return toppedUp.slice(0, desiredCount);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnostic sual generasiyası alınmadı.";
    throw new Error(message);
  }
}

export async function generateAdaptiveQuestions(input: {
  grade: Grade;
  subject: Subject;
  weakTopics: Topic[];
  level: StudentLevel;
  count?: number;
  excludedQuestionStems?: string[];
}): Promise<Question[]> {
  const desiredCount = input.count ?? 4;
  const openai = client();

  try {
    const response = await openai.responses.create({
      model: MODEL,
      temperature: 0.8,
      input: [
        { role: "system", content: ADAPTIVE_QUESTION_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            ...input,
            nonce: Date.now(),
            excludedQuestionStems: input.excludedQuestionStems?.slice(-80) ?? [],
            noveltyRule: "excludedQuestionStems daxilində olan sualları və eyni kökdə sualları təkrarlama.",
          }),
        },
      ],
    });

    const parsed = parseJsonSafe<{ questions?: Question[] } | Question[]>(response.output_text);
    const questions = validateAndRepairQuestions(
      input.grade,
      input.subject,
      normalizeQuestions(input.grade, input.subject, parsed),
    );
    const uniqueQuestions = uniqueByStem(questions, input.excludedQuestionStems ?? []);
    if (!uniqueQuestions.length) {
      throw new Error("AI adaptiv sual JSON-u düzgün deyil.");
    }
    if (uniqueQuestions.length >= desiredCount) {
      return uniqueQuestions.slice(0, desiredCount);
    }

    const fallback = getFallbackQuestions({
      grade: input.grade,
      subject: input.subject,
      topics: input.weakTopics,
      count: desiredCount * 2,
    });
    const toppedUp = uniqueByStem([...uniqueQuestions, ...fallback], input.excludedQuestionStems ?? []);
    return toppedUp.slice(0, desiredCount);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adaptiv sual generasiyası alınmadı.";
    throw new Error(message);
  }
}

export async function generateFeedbackSummary(input: {
  result: DiagnosticResult;
}): Promise<FeedbackSummary> {
  const openai = client();

  try {
    const response = await openai.responses.create({
      model: MODEL,
      temperature: 0.45,
      input: [
        { role: "system", content: FEEDBACK_SUMMARY_PROMPT },
        { role: "user", content: JSON.stringify(input.result) },
      ],
    });

    const parsed = parseJsonSafe<FeedbackSummary>(response.output_text);
    if (!parsed?.headline || !parsed?.summary) {
      throw new Error("AI feedback JSON-u düzgün deyil.");
    }

    return {
      headline: parsed.headline,
      summary: parsed.summary,
      strengths: parsed.strengths?.slice(0, 3) ?? FALLBACK_FEEDBACK.strengths,
      weaknesses: parsed.weaknesses?.slice(0, 3) ?? FALLBACK_FEEDBACK.weaknesses,
      nextStep: parsed.nextStep ?? FALLBACK_FEEDBACK.nextStep,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI feedback alınmadı.";
    throw new Error(message);
  }
}

export async function generateStudyPlan(input: {
  grade: Grade;
  subject: Subject;
  weakTopics: Topic[];
  level: StudentLevel;
  targetImprovement: string;
  curriculumTopics: Topic[];
  topicScores?: Array<{ topic: string; accuracy: number }>;
  errorPatterns?: string[];
  recommendedNextQuiz?: string;
}): Promise<StudyPlan> {
  const openai = client();

  try {
    const response = await openai.responses.create({
      model: MODEL,
      temperature: 0.5,
      input: [
        { role: "system", content: STUDY_PLAN_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            ...input,
            nonce: Date.now(),
            personalizationRule:
              "Plan şagirdin zəif mövzularına və mövzu göstəricilərinə uyğun konkret tapşırıqlar verməlidir.",
          }),
        },
      ],
    });

    const parsed = parseJsonSafe<StudyPlan>(response.output_text);
    if (!parsed?.days?.length) {
      throw new Error("AI study plan JSON-u düzgün deyil.");
    }
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI study plan alınmadı.";
    throw new Error(message);
  }
}
