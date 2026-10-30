"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { LearningDashboard } from "@/lib/practice-data";
import { CLOUD_STATUS_EVENT } from "@/components/account/cloud-provider";

export function ProgressPanel({ target, compact = false }: { target?: string; compact?: boolean }) {
  const [data, setData] = useState<LearningDashboard | null>(null);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const db = getSupabase();
        const { data: { session } } = await db.auth.getSession();
        if (!session) { if (active) setStatus("guest"); return; }
        const { data, error } = await db.rpc("learning_dashboard", target ? { target } : {});
        if (error) throw error;
        if (active) { setData(data); setStatus("ready"); }
      } catch { if (active) setStatus("error"); }
    }
    void load();
    const changed = (event: Event) => { if ((event as CustomEvent).detail === "Bazaya saxlanıldı") void load(); };
    window.addEventListener(CLOUD_STATUS_EVENT, changed);
    return () => { active = false; window.removeEventListener(CLOUD_STATUS_EVENT, changed); };
  }, [target]);
  if (status === "loading") return <p role="status" className="kairo-muted p-6">Analitika bazadan yüklənir…</p>;
  if (status === "guest") return <section className="kairo-card rounded-3xl p-8"><p className="eyebrow">SƏNİN İNKİŞAFIN</p><h2 className="mt-3 text-2xl font-semibold">İlk nəticənlə başlayaq.</h2><p className="kairo-muted my-4">Uydurma faizlər yoxdur. Hesabına daxil ol, sınağı tamamla və real göstəricilərini burada gör.</p><Link href="/account" className="text-red-400">Hesabına daxil ol →</Link></section>;
  if (!data || status === "error") return <p role="alert" className="kairo-card rounded-2xl p-5">Analitika yüklənmədi. Bağlantını yoxlayıb səhifəni yeniləyin.</p>;
  const { totals } = data;
  const accuracy = totals.questions ? Math.round(100 * totals.correct / totals.questions) : null;
  return <div className="space-y-6">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{ label: "Həll edilən sual", value: totals.questions }, { label: "Düzgün cavab", value: totals.correct }, { label: "Səhv cavab", value: totals.wrong }, { label: "Ümumi dəqiqlik", value: accuracy === null ? "—" : `${accuracy}%` }].map(item => <section key={item.label} className="kairo-card rounded-2xl p-5"><p className="kairo-muted text-xs">{item.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{item.value}</p></section>)}</div>
    {!totals.attempts ? <p className="kairo-muted rounded-2xl border border-dashed border-[var(--card-border)] p-6">Hələ sınaq qeydi yoxdur. İlk testi tamamladıqdan sonra günlük inkişaf, fənn və mövzu göstəriciləri görünəcək.</p> : <>
      <div className="grid gap-5 lg:grid-cols-2"><section className="kairo-card rounded-3xl p-6"><div className="flex items-center justify-between"><h2 className="font-semibold">Günlük irəliləyiş</h2><span className="kairo-muted text-xs">Son 14 gün · Bakı vaxtı</span></div><div className="daily-chart">{Array.from({ length: 14 }, (_, i) => {
        const date = new Date(); date.setDate(date.getDate() - 13 + i);
        const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Baku" }).format(date);
        const record = data.daily.find(d => d.day === day);
        const total = Number(record?.total ?? 0), correct = Number(record?.correct ?? 0);
        const maximum = Math.max(1, ...data.daily.map(d => Number(d.total)));
        return <div key={day} className="daily-column" title={`${day}: ${total} sual, ${correct} düzgün, ${total - correct} səhv`}><span className="text-[10px] text-zinc-400">{total || ""}</span><div className="daily-bar" style={{ height: `${Math.max(2, 120 * total / maximum)}px` }}><div style={{ height: `${total ? 100 * correct / total : 0}%` }} /></div><span className="kairo-muted text-[10px]">{day.slice(8)}</span></div>;
      })}</div><p className="kairo-muted mt-4 text-xs"><span className="text-emerald-400">● Düzgün</span> · <span className="text-red-400">● Səhv</span> · Sütunun üstündə sual sayı</p></section>
      <section className="kairo-card rounded-3xl p-6"><h2 className="font-semibold">Fənn üzrə mənzərə</h2><div className="mt-5 space-y-5">{data.subjects.map(s => <div key={s.subject}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{s.subject}</span><span className="kairo-muted">{s.correct}/{s.total} · {Math.round(100 * s.correct / s.total)}%</span></div><div className="h-2 overflow-hidden rounded-full bg-red-400/20"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${100 * s.correct / s.total}%` }} /></div></div>)}</div></section></div>
      {!compact && <section className="kairo-card overflow-hidden rounded-3xl"><div className="p-6"><h2 className="font-semibold">Hansı mövzulara qayıtmalı?</h2><p className="kairo-muted mt-2 text-sm">Ən aşağı dəqiqlikdən başlayır. Az sual həll olunan mövzular əlavə yoxlama tələb edir.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-white/5"><tr>{["Fənn / mövzu", "Düzgün", "Səhv", "Dəqiqlik"].map(h => <th key={h} scope="col" className="px-6 py-3">{h}</th>)}</tr></thead><tbody>{data.topics.map(t => <tr key={`${t.subject}:${t.topic}`} className="border-t border-[var(--card-border)]"><td className="px-6 py-4"><span className="kairo-muted block text-xs">{t.subject}</span>{t.topic}</td><td className="px-6 py-4 text-emerald-400">{t.correct}</td><td className="px-6 py-4 text-red-400">{t.total - t.correct}</td><td className="px-6 py-4">{Math.round(100 * t.correct / t.total)}%</td></tr>)}</tbody></table></div></section>}
    </>}
    <p className="kairo-muted text-xs">{totals.attempts} sınaq · {Math.round(totals.seconds / 60)} dəqiqə ölçülmüş sessiya müddəti ({totals.timed_attempts} sınaq). Əvvəlki vaxtsız qeydlərə müddət uydurulmur. Göstəricilər məşq nəticələridir, rəsmi imtahan balı deyil.</p>
  </div>;
}
