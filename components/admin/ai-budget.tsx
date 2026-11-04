"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

type Budget = { enabled: boolean; not_before: string; model: string; daily_limit: number; reserved_tokens: number; requests: number; checkedAt: number };
export function AIBudget() {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data, error } = await getSupabase().rpc("ai_budget_status");
      if (active) { setError(!!error); setBudget(error || !data ? null : { ...data, checkedAt: Date.now() }); }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 60000);
    return () => { active = false; clearInterval(timer); };
  }, []);
  return <section className="space-y-3 rounded-2xl border border-current/15 p-5" aria-labelledby="ai-budget-title">
    <h2 id="ai-budget-title" className="text-xl">Pulsuz AI istifadə nəzarəti</h2>
    {error ? <p role="alert">Token nəzarəti yüklənmədi. Təhlükəsiz limit təsdiqlənməsə AI sorğusu göndərilmir.</p> : !budget ? <p role="status">Limit yüklənir…</p> : <>
      <p><strong>{budget.model}</strong> · {!budget.enabled ? "Açarın təşkilatı təsdiqlənənədək bağlıdır" : Date.parse(budget.not_before) > budget.checkedAt ? `Başlanğıc: ${new Date(budget.not_before).toLocaleString("az-AZ", { timeZone: "Asia/Baku" })}` : "Limit nəzarəti aktivdir"}</p>
      <progress className="w-full" value={budget.reserved_tokens} max={budget.daily_limit} aria-label="Gündəlik token ehtiyatı" />
      <p>{budget.reserved_tokens.toLocaleString("az-AZ")} / {budget.daily_limit.toLocaleString("az-AZ")} ehtiyat token · {budget.requests} sorğu</p>
      <p className="text-sm kairo-muted">Bu say faktiki OpenAI istifadəsi deyil: hər sorğunun girişinə və maksimum cavabına qabaqcadan ayrılan ehtiyatdır. Ləğv və xətalarda geri açılmır. Limit bütün sayt istifadəçiləri və mühitlər üçün ortaqdır; Bakı vaxtı 04:05-də yenilənir. Ödənişli alətlər və başqa modelə avtomatik keçid bağlıdır.</p>
      <p className="text-sm kairo-muted">OpenAI təşkilatında digər layihələrin istifadəsi və pulsuz proqramın statusu ayrıca izlənməlidir. Təşkilat üzrə faktiki xərc üçün OpenAI Usage səhifəsinə bax.</p>
    </>}
  </section>;
}
