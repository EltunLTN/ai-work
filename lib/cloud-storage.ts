import { getSupabase } from "@/lib/supabase/client";
import { getAttemptHistory, getMiniQuizAttempts } from "@/lib/storage";
import { practiceRows } from "@/lib/practice-data";

const DATA_KEYS = new Set(["kairo.profile", "kairo.questions", "kairo.answers", "kairo.result", "kairo.feedback", "kairo.plan", "kairo.analysis", "kairo.gamification", "kairo.question.history", "kairo.attempts", "kairo.activity", "kairo.quiz.pending", "kairo.feedback.result", "kairo.mini.attempts", "kairo.result.review"]);
const isLearningKey = (key: string) => DATA_KEYS.has(key) || /^kairo\.plan\.progress\./.test(key);

export async function saveToCloud() {
  const db = getSupabase();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new Error("Əvvəlcə daxil olun.");
  const data: Record<string, unknown> = {};
  for (const key of Object.keys(localStorage)) {
    if (isLearningKey(key)) {
      try { data[key] = JSON.parse(localStorage.getItem(key)!); } catch { /* Skip damaged browser data. */ }
    }
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > 1000000) throw new Error("Məlumat 1 MB limitini keçir.");
  const { error } = await db.from("learning_snapshots").upsert({ user_id: user.id, data, updated_at: new Date().toISOString() });
  if (error) throw new Error("Məlumat saxlanmadı. Yenidən cəhd edin.");
  const rows = practiceRows(user.id, getAttemptHistory(), getMiniQuizAttempts());
  if (rows.length) {
    const { error: attemptError } = await db.from("practice_attempts").upsert(rows, { onConflict: "user_id,attempt_id", ignoreDuplicates: true });
    if (attemptError) throw new Error("Sınaq tarixçəsi saxlanmadı. Bağlantını yoxlayın.");
  }
}

export async function restoreFromCloud(allowMissing = false) {
  const db = getSupabase();
  const { data: { user }, error: authError } = await db.auth.getUser();
  if (authError || !user) throw new Error("Əvvəlcə daxil olun.");
  const { data: row, error } = await db.from("learning_snapshots").select("data").eq("user_id", user.id).maybeSingle();
  if (error) throw new Error("Məlumat yüklənmədi.");
  if (!row) { if (allowMissing) return false; throw new Error("Bu hesab üçün saxlanmış məlumat yoxdur."); }
  const backup = Object.fromEntries(Object.keys(localStorage).filter(isLearningKey).map(key => [key, localStorage.getItem(key)!]));
  try {
    for (const key of Object.keys(backup)) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(row.data as Record<string, unknown>)) {
      if (isLearningKey(key)) localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {
    for (const key of Object.keys(localStorage).filter(isLearningKey)) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(backup)) localStorage.setItem(key, value);
    throw new Error("Brauzerdə yer çatmır. Əvvəlki məlumatlar qorundu.");
  }
  return true;
}

export function clearLearningData() {
  for (const key of Object.keys(localStorage).filter(isLearningKey)) localStorage.removeItem(key);
  for (const key of Object.keys(sessionStorage).filter(key => key.startsWith("kairo."))) sessionStorage.removeItem(key);
}
