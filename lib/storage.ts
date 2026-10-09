import type {
  AnalysisResult,
  FeedbackSummary,
  GamificationState,
  Question,
  QuizAnswers,
  QuizResult,
  StudentProfile,
  StudyPlan,
} from "@/lib/types";
import { getTextbookById } from "@/lib/textbook-reference";

const KEYS = {
  profile: "kairo.profile",
  questions: "kairo.questions",
  answers: "kairo.answers",
  result: "kairo.result",
  feedback: "kairo.feedback",
  plan: "kairo.plan",
  analysis: "kairo.analysis",
  gamification: "kairo.gamification",
  questionHistory: "kairo.question.history",
};

function normalizeQuestionStem(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(key);
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function saveStudentProfile(profile: StudentProfile) {
  write(KEYS.profile, profile);
}

export function getStudentProfile() {
  const profile = read<StudentProfile>(KEYS.profile);
  if (!profile) return null;
  if (Array.isArray(profile.selectedTopics) && profile.selectedTopics.length) {
    return profile;
  }
  const topics = getTextbookById(profile.textbookId)?.topics ?? [];
  return {
    ...profile,
    selectedTopics: topics.slice(0, 4),
  };
}

export function saveQuizQuestions(questions: Question[]) {
  write(KEYS.questions, questions);
}

export function getQuizQuestions() {
  return read<Question[]>(KEYS.questions);
}

export function saveQuizAnswers(answers: QuizAnswers) {
  write(KEYS.answers, answers);
}

export function getQuizAnswers() {
  return read<QuizAnswers>(KEYS.answers);
}

export function saveQuizResult(result: QuizResult) {
  write(KEYS.result, result);
}

export function getQuizResult() {
  return read<QuizResult>(KEYS.result);
}

export function saveFeedback(feedback: FeedbackSummary) {
  write(KEYS.feedback, feedback);
}

export function getFeedback() {
  return read<FeedbackSummary>(KEYS.feedback);
}

export function saveStudyPlan(plan: StudyPlan) {
  write(KEYS.plan, plan);
}

export function getStudyPlan() {
  return read<StudyPlan>(KEYS.plan);
}

export function saveAnalysis(analysis: AnalysisResult) {
  write(KEYS.analysis, analysis);
}

export function getAnalysis() {
  return read<AnalysisResult>(KEYS.analysis);
}

export function saveGamification(state: GamificationState) {
  write(KEYS.gamification, state);
}

export function getGamification() {
  return read<GamificationState>(KEYS.gamification);
}

export function getQuestionHistory() {
  return read<string[]>(KEYS.questionHistory) ?? [];
}

export function appendQuestionHistory(questionTexts: string[]) {
  const history = getQuestionHistory();
  const next = [...history, ...questionTexts.map(normalizeQuestionStem)]
    .filter(Boolean)
    .slice(-250);
  write(KEYS.questionHistory, [...new Set(next)]);
}
