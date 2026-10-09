import type { GamificationState, QuizResult } from "@/lib/types";

const BASE_XP = 50;

function toLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function updateGamificationFromResult(result: QuizResult, previous?: GamificationState | null): GamificationState {
  const accuracyXp = Math.round(result.overallAccuracy * 1.2);
  const bonus = result.overallAccuracy >= 70 ? 30 : 10;
  const gained = BASE_XP + accuracyXp + bonus;

  const lastDate = previous ? new Date().toDateString() : null;
  const today = new Date().toDateString();
  const streak = lastDate === today ? previous?.streak ?? 1 : (previous?.streak ?? 0) + 1;
  const xp = (previous?.xp ?? 0) + gained;

  return {
    xp,
    streak,
    level: toLevel(xp),
    dailyProgress: Math.max(0, Math.min(100, result.overallAccuracy)),
  };
}
