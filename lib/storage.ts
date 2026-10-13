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
import { updateGamificationFromResult } from "@/lib/gamification";

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
  attempts: "kairo.attempts",
  activity: "kairo.activity",
  pendingQuiz: "kairo.quiz.pending",
  feedbackResult: "kairo.feedback.result",
  miniAttempts: "kairo.mini.attempts",
  resultReview: "kairo.result.review",
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
  if (typeof window === "undefined") return;
  const previous = read<StudentProfile>(KEYS.profile);
  if (JSON.stringify(previous) !== JSON.stringify(profile)) {
    for (const key of [KEYS.questions, KEYS.answers, KEYS.result, KEYS.resultReview, KEYS.feedback, KEYS.feedbackResult, KEYS.plan, KEYS.analysis, KEYS.pendingQuiz]) {
      window.localStorage.removeItem(key);
    }
  }
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
  if (typeof window === "undefined") return;
  const previous = read<QuizResult>(KEYS.result);
  if (previous?.submittedAt !== result.submittedAt) {
    for (const key of [KEYS.feedback, KEYS.feedbackResult, KEYS.plan, KEYS.analysis]) window.localStorage.removeItem(key);
  }
  write(KEYS.result, result);
  if (previous?.submittedAt !== result.submittedAt || !read(KEYS.resultReview)) {
    write(KEYS.resultReview, { submittedAt: result.submittedAt, questions: getQuizQuestions() ?? [], answers: getQuizAnswers() ?? {} });
  }
  const attempts = getAttemptHistory();
  if (!attempts.some((item) => item.submittedAt === result.submittedAt)) {
    write(KEYS.attempts, [...attempts, result].slice(-50));
    logActivity(`Sınaq tamamlandı: ${result.totalCorrect}/${result.totalQuestions} düzgün cavab`, result.submittedAt);
  }
  saveGamification(updateGamificationFromResult(result, getGamification()));
}

export function getQuizResult() {
  const result = read<QuizResult>(KEYS.result);
  const profile = getStudentProfile();
  return result && profile && result.grade === profile.grade && result.subject === profile.subject ? result : null;
}

export function getResultReview(): { questions: Question[]; answers: QuizAnswers } {
  const review = read<{ submittedAt: string; questions: Question[]; answers: QuizAnswers }>(KEYS.resultReview);
  return review && review.submittedAt === getQuizResult()?.submittedAt
    ? { questions: review.questions, answers: review.answers } : { questions: [], answers: {} };
}

export function saveFeedback(feedback: FeedbackSummary, resultSubmittedAt = getQuizResult()?.submittedAt) {
  if (resultSubmittedAt !== getQuizResult()?.submittedAt) return;
  write(KEYS.feedback, feedback);
  write(KEYS.feedbackResult, resultSubmittedAt);
}

export function getFeedback() {
  return read<string>(KEYS.feedbackResult) === getQuizResult()?.submittedAt ? read<FeedbackSummary>(KEYS.feedback) : null;
}

export function saveStudyPlan(plan: StudyPlan) {
  if (plan.resultSubmittedAt && plan.resultSubmittedAt !== getQuizResult()?.submittedAt) return;
  write(KEYS.plan, plan);
  logActivity("Fərdi 7 günlük AI plan yaradıldı", plan.generatedAt);
}

export function clearStudyPlan() {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.plan);
}

export function getPlanProgress(plan: StudyPlan): Record<string, boolean> {
  return read<Record<string, boolean>>(`kairo.plan.progress.${plan.generatedAt}`) ?? {};
}

export function savePlanProgress(plan: StudyPlan, progress: Record<string, boolean>) {
  write(`kairo.plan.progress.${plan.generatedAt}`, progress);
}

export function getAttemptHistory() {
  return read<QuizResult[]>(KEYS.attempts) ?? [];
}

export function savePendingQuiz(questions: Question[]) {
  write(KEYS.pendingQuiz, questions);
  appendQuestionHistory(questions.map((question) => question.question));
  logActivity("Adaptiv AI sual dəsti yaradıldı");
}

export function consumePendingQuiz() {
  const pending = read<Question[]>(KEYS.pendingQuiz);
  if (typeof window !== "undefined") window.localStorage.removeItem(KEYS.pendingQuiz);
  return pending;
}

export function logActivity(title: string, date = new Date().toISOString()) {
  const events = getActivity();
  if (!events.some((event) => event.title === title && event.date === date)) write(KEYS.activity, [{ title, date }, ...events].slice(0, 50));
}

export function getActivity(): Array<{ title: string; date: string }> {
  return read(KEYS.activity) ?? [];
}

export interface MiniQuizAttempt {
  id: string;
  grade: string;
  topic: string;
  correct: number;
  total: number;
  submittedAt: string;
}

export function saveMiniQuizAttempt(attempt: MiniQuizAttempt) {
  const attempts = getMiniQuizAttempts();
  if (attempts.some((item) => item.id === attempt.id)) return;
  write(KEYS.miniAttempts, [...attempts, attempt].slice(-100));
  logActivity(`${attempt.topic}: mini test ${attempt.correct}/${attempt.total}`, attempt.submittedAt);
}

export function getMiniQuizAttempts() {
  return read<MiniQuizAttempt[]>(KEYS.miniAttempts) ?? [];
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
