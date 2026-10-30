import type { MiniQuizAttempt } from "@/lib/storage";
import type { QuizResult, TopicScore } from "@/lib/types";

export type PracticeRow = { user_id: string; attempt_id: string; kind: "quiz" | "mini"; subject: string; grade: string; total: number; correct: number; topic_scores: TopicScore[]; submitted_at: string; duration_seconds: number | null };
export function practiceRows(userId: string, attempts: QuizResult[], minis: MiniQuizAttempt[]): PracticeRow[] {
  const seconds = (value?: number) => typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(14400, Math.round(value))) : null;
  const rows: PracticeRow[] = attempts.map(a => ({ user_id: userId, attempt_id: `quiz-${a.submittedAt}`, kind: "quiz", subject: a.subject, grade: a.grade, total: a.totalQuestions, correct: a.totalCorrect, topic_scores: a.topicScores, submitted_at: a.submittedAt, duration_seconds: seconds(a.durationSeconds) }));
  rows.push(...minis.map(a => ({ user_id: userId, attempt_id: `mini-${a.id}`, kind: "mini" as const, subject: a.subject ?? "Riyaziyyat", grade: a.grade, total: a.total, correct: a.correct, topic_scores: [{ topic: a.topic, correct: a.correct, total: a.total, accuracy: Math.round(100 * a.correct / a.total) }], submitted_at: a.submittedAt, duration_seconds: seconds(a.durationSeconds) })));
  return rows.filter(a => a.total > 0 && a.total <= 100 && a.correct >= 0 && a.correct <= a.total && Number.isFinite(Date.parse(a.submitted_at)));
}

export interface LearningDashboard {
  totals: { attempts: number; questions: number; correct: number; wrong: number; seconds: number; timed_attempts: number };
  daily: Array<{ day: string; total: number; correct: number; attempts: number }>;
  subjects: Array<{ subject: string; total: number; correct: number; attempts: number }>;
  topics: Array<{ subject: string; topic: string; total: number; correct: number }>;
}
