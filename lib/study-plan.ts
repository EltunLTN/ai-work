import { getLearningResources } from "@/lib/learning-resources";
import type { Grade, StudyPlan, Subject } from "@/lib/types";

export const STUDY_PLAN_VERSION = 2;

export function validateStudyPlan(value: unknown, topics: string[], grade: Grade, subject: Subject = "Riyaziyyat"): StudyPlan | null {
  if (!value || typeof value !== "object") return null;
  const plan = value as StudyPlan;
  const text = (item: unknown): item is string => typeof item === "string" && item.trim().length > 0;
  if (!text(plan.title) || !text(plan.summary) || !Array.isArray(plan.days) || plan.days.length !== 7 ||
      !Array.isArray(plan.tips) || plan.tips.length < 1 || !plan.tips.every(text)) return null;

  const days = [...plan.days].sort((a, b) => (a?.day ?? 0) - (b?.day ?? 0));
  if (!days.every((day, index) => day && day.day === index + 1 && text(day.topic) &&
      topics.includes(day.topic) && text(day.focus) && Array.isArray(day.tasks) &&
      day.tasks.length >= 2 && day.tasks.length <= 4 && day.tasks.every(text) &&
      Number.isInteger(day.estimatedMinutes) && day.estimatedMinutes >= 15 && day.estimatedMinutes <= 120 &&
      typeof day.checkpoint === "boolean") || !days.some((day) => day.checkpoint)) return null;

  return {
    title: plan.title.trim(),
    summary: plan.summary.trim(),
    tips: plan.tips.map((tip) => tip.trim()),
    version: STUDY_PLAN_VERSION,
    generatedAt: new Date().toISOString(),
    days: days.map((day) => ({
      day: day.day,
      topic: day.topic,
      focus: day.focus.trim(),
      tasks: day.tasks.map((task) => task.trim()),
      estimatedMinutes: day.estimatedMinutes,
      checkpoint: day.checkpoint,
      resources: getLearningResources(day.topic!, grade, subject),
    })),
  };
}

export function isCurrentStudyPlan(plan: StudyPlan | null, submittedAt: string): plan is StudyPlan {
  return Boolean(plan && plan.version === STUDY_PLAN_VERSION && plan.resultSubmittedAt === submittedAt);
}

export function getPlanCompletion(plan: StudyPlan | null, progress: Record<string, boolean>): number {
  if (!plan) return 0;
  const tasks = plan.days.flatMap((day) => day.tasks.map((task) => `${day.day}:${task}`));
  return tasks.length ? Math.round(tasks.filter((key) => progress[key]).length / tasks.length * 100) : 0;
}
