import { getGrades, getTextbooksBySelection, isSubject } from "@/lib/textbook-reference";
import { estimatePerformance } from "@/lib/score-estimate";
import type { ChatMessage, Grade, TutorContext } from "@/lib/types";

export function parseChatInput(value: unknown): { messages: ChatMessage[]; context: TutorContext; locale: "az" | "en" } | null {
  if (!value || typeof value !== "object") return null;
  const body = value as { messages?: unknown; context?: TutorContext; locale?: string };
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 20) return null;
  const messages: ChatMessage[] = [];
  for (const message of body.messages) {
    if (!message || (message.role !== "user" && message.role !== "assistant") ||
        typeof message.content !== "string" || !message.content.trim() || message.content.length > 6000) return null;
    messages.push({ role: message.role, content: message.content.trim() });
  }
  if (messages.at(-1)?.role !== "user" || messages.reduce((sum, m) => sum + m.content.length, 0) > 40000) return null;

  const raw = body.context;
  if (raw?.subject !== undefined && !isSubject(raw.subject)) return null;
  const subject = isSubject(raw?.subject) ? raw.subject : "Riyaziyyat";
  const grade = raw && getGrades(subject).includes(raw.grade as Grade) ? raw.grade : undefined;
  const curriculum = grade ? getTextbooksBySelection(grade, subject).flatMap((book) => book.topics) : [];
  const context: TutorContext = {
    grade,
    subject,
    topics: Array.isArray(raw?.topics) ? raw.topics.filter((topic) => curriculum.includes(topic)).slice(0, 20) : [],
  };
  if (raw?.result && Array.isArray(raw.result.topicScores) && estimatePerformance(raw.result) &&
      raw.result.topicScores.length <= 30 && raw.result.topicScores.every((score) => score &&
        typeof score.topic === "string" && score.topic.length <= 200 &&
        Number.isInteger(score.total) && score.total > 0 && Number.isInteger(score.correct) &&
        score.correct >= 0 && score.correct <= score.total) &&
      raw.result.topicScores.reduce((sum, score) => sum + score.total, 0) === raw.result.totalQuestions &&
      raw.result.topicScores.reduce((sum, score) => sum + score.correct, 0) === raw.result.totalCorrect) {
    context.result = {
      totalQuestions: raw.result.totalQuestions,
      totalCorrect: raw.result.totalCorrect,
      submittedAt: typeof raw.result.submittedAt === "string" ? raw.result.submittedAt.slice(0, 40) : "",
      topicScores: raw.result.topicScores.map((score) => ({
        topic: score.topic, correct: score.correct, total: score.total,
        accuracy: Math.round(score.correct / score.total * 100),
      })),
    };
  }
  if (raw?.plan && typeof raw.plan.title === "string" && Array.isArray(raw.plan.days)) {
    context.plan = {
      title: raw.plan.title.slice(0, 200),
      days: raw.plan.days.slice(0, 7).filter((day) => day && Number.isInteger(day.day) && day.day >= 1 && day.day <= 7 &&
        typeof day.focus === "string" && typeof day.topic === "string" && curriculum.includes(day.topic) &&
        Number.isFinite(day.estimatedMinutes) && day.estimatedMinutes > 0 && day.estimatedMinutes <= 120 &&
        Array.isArray(day.tasks) && day.tasks.every((task) => typeof task === "string"))
        .map((day) => ({ day: day.day, topic: day.topic, focus: day.focus.slice(0, 200),
          tasks: day.tasks.slice(0, 4).map((task) => task.slice(0, 500)), estimatedMinutes: day.estimatedMinutes })),
    };
  }
  return { messages, context, locale: body.locale === "en" ? "en" : "az" };
}
