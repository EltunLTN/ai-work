import type { GamificationState, QuizResult } from "@/lib/types";

const BASE_XP = 50;

function toLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function updateGamificationFromResult(result: QuizResult, previous?: GamificationState | null): GamificationState {
  if (previous?.processedResultIds?.includes(result.submittedAt)) return previous;
  const accuracyXp = Math.round(result.overallAccuracy * 1.2);
  const bonus = result.overallAccuracy >= 70 ? 30 : 10;
  const gained = BASE_XP + accuracyXp + bonus;

  const date = new Date(result.submittedAt);
  const today = date.toLocaleDateString("en-CA", { timeZone: "Asia/Baku" });
  const yesterday = new Date(date.getTime() - 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Baku" });
  const streak = previous?.lastActivityDate === today ? previous.streak
    : previous?.lastActivityDate === yesterday ? previous.streak + 1 : 1;
  const xp = (previous?.xp ?? 0) + gained;

  return {
    xp,
    streak,
    level: toLevel(xp),
    dailyProgress: Math.max(0, Math.min(100, result.overallAccuracy)),
    lastActivityDate: today,
    processedResultIds: [...(previous?.processedResultIds ?? []), result.submittedAt].slice(-200),
  };
}
