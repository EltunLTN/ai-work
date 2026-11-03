import { getSupabase } from "@/lib/supabase/client";
export const ACTIVITY_KINDS = ["page.view", "auth.signed_in", "auth.signed_out", "ui.click", "form.submitted", "exam.configured", "exam.started", "exam.answer_selected", "exam.completed", "history.exported"] as const;
type ActivityKind = typeof ACTIVITY_KINDS[number];
let queue: Array<{ kind: ActivityKind; path: string; details: Record<string, string | number> }> = [], timer: ReturnType<typeof setTimeout> | undefined;
export function trackActivity(kind: ActivityKind, details: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  queue.push({ kind, path: location.pathname, details });
  clearTimeout(timer);
  if (queue.length >= 20) void flushActivity();
  else timer = setTimeout(() => void flushActivity(), 1200);
}
export async function flushActivity() {
  clearTimeout(timer); if (!queue.length) return;
  const events = queue; queue = [];
  try {
    const { data: { session } } = await getSupabase().auth.getSession(); if (!session) return;
    await fetch("/api/activity", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ events }) });
  } catch { /* Learning and authentication remain usable if operational logging is unavailable. */ }
}
