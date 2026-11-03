"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw, Download, CalendarDays, Target, CheckCheck, Clock3 } from "lucide-react";
import { getSupabase } from "@/lib/supabase/client";
import { getSubjects } from "@/lib/textbook-reference";
import { attemptsCsv } from "@/lib/admin-export";
import { CLOUD_STATUS_EVENT } from "@/components/account/cloud-provider";
import { trackActivity } from "@/lib/activity-client";
import type { PracticeRow, LearningDashboard } from "@/lib/practice-data";

type WorkspaceData = Omit<LearningDashboard, "totals" | "topics"> & { totals: LearningDashboard["totals"] & { active_days: number; last_active: string | null }; topics: Array<{ subject: string; grade: string; topic: string; total: number; correct: number }> };
const subjects = getSubjects(), symbols = ["∫", "↗", "⌘", "◎", "H₂"];
const dateLabel = (s: string) => new Date(s).toLocaleString("az-AZ", { timeZone: "Asia/Baku", dateStyle: "medium", timeStyle: "short" });
const dayNow = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Baku" }).format(new Date());
const percent = (correct: number, total: number) => total ? `${Math.round(100 * correct / total)}%` : "—";
export function LearningWorkspace({ target }: { target?: string }) {
  const [data, setData] = useState<WorkspaceData | null>(null), [overview, setOverview] = useState<WorkspaceData | null>(null);
  const [rows, setRows] = useState<PracticeRow[]>([]), [totalRows, setTotalRows] = useState(0), [status, setStatus] = useState("loading");
  const [name, setName] = useState(""), [subject, setSubject] = useState(""), [grade, setGrade] = useState("");
  const [from, setFrom] = useState(""), [to, setTo] = useState(""), [page, setPage] = useState(0), [revision, setRevision] = useState(0);
  const [savedAt, setSavedAt] = useState("");
  const invalidRange = Boolean(from && to && from > to);
  useEffect(() => {
    const refresh = (e: Event) => { if ((e as CustomEvent).detail === "Bazaya saxlanıldı") setRevision(v => v + 1); };
    window.addEventListener(CLOUD_STATUS_EVENT, refresh); return () => window.removeEventListener(CLOUD_STATUS_EVENT, refresh);
  }, []);
  useEffect(() => {
    let live = true;
    if (invalidRange) return;
    void (async () => {
      setStatus("loading");
      try {
        const db = getSupabase(); const { data: { user }, error: authError } = await db.auth.getUser();
        if (authError || !user) { if (live) { setData(null); setOverview(null); setRows([]); setStatus("guest"); } return; }
        const owner = target ?? user.id;
        const args = { target: owner, from_day: from || null, to_day: to || null, selected_subject: subject || null, school_grade: grade || null };
        let history = db.from("practice_attempts").select("attempt_id,user_id,kind,subject,grade,total,correct,topic_scores,submitted_at,duration_seconds", { count: "exact" }).eq("user_id", owner).order("submitted_at", { ascending: false }).order("attempt_id", { ascending: false }).range(page * 12, page * 12 + 11);
        if (subject) history = history.eq("subject", subject); if (grade) history = history.eq("grade", grade);
        if (from) history = history.gte("submitted_at", `${from}T00:00:00+04:00`);
        if (to) history = history.lt("submitted_at", new Date(new Date(`${to}T00:00:00+04:00`).getTime() + 86400000).toISOString());
        const [stats, list, account, all] = await Promise.all([db.rpc("learning_workspace", args), history, db.from("account_profiles").select("first_name,last_name").eq("id", owner).maybeSingle(), subject ? db.rpc("learning_workspace", { ...args, selected_subject: null }) : Promise.resolve(null)]);
        if (stats.error || list.error || all?.error || account.error) throw new Error("load");
        if (!live) return;
        setData(stats.data); setOverview(all?.data ?? stats.data); setRows((list.data ?? []) as PracticeRow[]); setTotalRows(list.count ?? 0);
        setName([account.data?.first_name, account.data?.last_name].filter(Boolean).join(" ")); setSavedAt(new Date().toLocaleTimeString("az-AZ", { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit" })); setStatus("ready");
      } catch { if (live) setStatus("error"); }
    })(); return () => { live = false; };
  }, [target, subject, grade, from, to, page, revision, invalidRange]);
  const changeFilter = (setter: (value: string) => void, value: string) => { setter(value); setPage(0); };
  function period(days: number | null) { const end = dayNow(); setFrom(days ? new Date(new Date(`${end}T12:00:00+04:00`).getTime() - (days - 1) * 86400000).toISOString().slice(0,10) : ""); setTo(days ? end : ""); setPage(0); }
  const ready = status === "ready" && !invalidRange, totals = ready ? data?.totals : null;
  const endDay = to || dayNow(), end = new Date(`${endDay}T12:00:00+04:00`).getTime();
  const days = Array.from({ length: 30 }, (_, i) => { const day = new Date(end - (29 - i) * 86400000).toISOString().slice(0,10); return { day, ...(ready ? data?.daily.find(d => d.day === day) : null) }; }).filter(d => !from || d.day >= from);
  const maximum = Math.max(1, ...days.map(d => d.total ?? 0));
  const weak = ready ? data?.topics.filter(t => t.correct < t.total).slice(0,5) ?? [] : [];
  const Heading = target ? "h2" : "h1";
  return <div className="learning-workspace">
    <div className="dashboard-welcome"><div><p className="eyebrow">SƏNİN ÖYRƏNMƏ MƏKANIN</p><Heading>{name ? `${name}, irəliləyişinə bax.` : "Hər məşq bir addımdır."}</Heading><p>Fənnlərin, gündəlik ritmin və nəticələrinin tam tarixçəsi.</p></div><Link className="editorial-button" href="/onboarding">Yeni sınaq qur <ArrowUpRight size={18} /></Link></div>
    <section className="dashboard-filterbar" aria-label="Nəticə filtrləri"><label>Fənn<select value={subject} onChange={e => changeFilter(setSubject,e.target.value)}><option value="">Bütün fənnlər</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label><label>Sinif<select value={grade} onChange={e => changeFilter(setGrade,e.target.value)}><option value="">Bütün siniflər</option>{Array.from({length:11},(_,i) => <option key={i} value={i+1}>{i+1}-ci sinif</option>)}</select></label><label>Başlanğıc<input type="date" value={from} max={to || dayNow()} onChange={e => changeFilter(setFrom,e.target.value)} /></label><label>Son tarix<input type="date" value={to} min={from} max={dayNow()} onChange={e => changeFilter(setTo,e.target.value)} /></label><button className="dashboard-refresh" onClick={() => setRevision(v => v + 1)} disabled={status === "loading"} aria-label="Analitikanı yenilə"><RefreshCw size={17} /></button><div className="dashboard-periods"><button onClick={() => period(7)}>7 gün</button><button onClick={() => period(30)}>30 gün</button><button onClick={() => period(null)}>Bütün tarix</button></div></section>
    {invalidRange && <p role="alert" className="dashboard-notice">Başlanğıc tarixi son tarixdən sonra ola bilməz.</p>}
    {status === "guest" && <div className="dashboard-notice"><h2>İlk nəticənlə başlayaq.</h2><p>Hesabına daxil ol və sınağı tamamla. Bütün fənnlər üzrə şəxsi analitikan burada görünəcək.</p><Link href="/account" className="text-link">Hesaba daxil ol →</Link></div>}
    {status === "loading" && <p role="status" className="dashboard-notice">Bazadakı nəticələrin yüklənir…</p>}
    {status === "error" && <p role="alert" className="dashboard-notice">Məlumat yüklənmədi. Bağlantını yoxla və yenilə düyməsinə bas.</p>}
    <section className="dashboard-kpis" aria-label="Əsas göstəricilər">{[
      { label:"Həll edilən sual", value:totals?.questions, detail:totals ? `${totals.attempts} fənn sınağı` : "Sınaq nəticələri", Icon:Target },
      { label:"Dəqiqlik", value:totals ? percent(totals.correct,totals.questions) : "—", detail:totals ? `${totals.correct} düzgün · ${totals.wrong} səhv` : "Düzgün / ümumi", Icon:CheckCheck },
      { label:"Məşq müddəti", value:totals ? `${Math.round(totals.seconds/60)} dəq` : "—", detail:totals ? `${totals.timed_attempts} vaxtı ölçülmüş sınaq` : "Yalnız ölçülmüş müddət", Icon:Clock3 },
      { label:"Aktiv gün", value:totals?.active_days, detail:totals?.last_active ? `Son məşq: ${dateLabel(totals.last_active)}` : "İlk məşqini gözləyir", Icon:CalendarDays }
    ].map(({label,value,detail,Icon}) => <article key={label}><div><span>{label}</span><Icon size={17} /></div><strong>{value ?? "—"}</strong><p>{detail}</p></article>)}</section>
    <section className="dashboard-subject-section"><div className="dashboard-section-title"><div><p className="eyebrow">01 / FƏNN XƏRİTƏN</p><h2>Hər fənn öz yerində.</h2></div><p>Seçilmiş tarix və sinif üzrə · fənnə basaraq süzgəclə</p></div><div className="dashboard-subject-grid">{subjects.map((s,i) => { const record = ready ? overview?.subjects.find(r => r.subject === s) : null; return <button className={`subject-progress-card ${subject===s ? "selected" : ""}`} key={s} onClick={() => changeFilter(setSubject,subject===s ? "" : s)} aria-pressed={subject===s}><div><span className="subject-progress-symbol">{symbols[i]}</span><ArrowUpRight size={17} /></div><h3>{s}</h3><strong>{percent(record?.correct ?? 0,record?.total ?? 0)}</strong><div className="accuracy-track"><i style={{width:`${record?.total ? 100*record.correct/record.total : 0}%`}} /></div><p>{record ? `${record.attempts} sınaq · ${record.total} sual` : "Hələ nəticə yoxdur"}</p><small>{record ? `${record.correct} düzgün · ${record.total-record.correct} səhv` : "İlk sınaqla başla"}</small></button>; })}</div></section>
    <div className="dashboard-analysis-grid"><section className="dashboard-panel"><div className="dashboard-section-title"><div><p className="eyebrow">02 / GÜNLÜK RİTM</p><h2>Məşqin izləri.</h2></div><span>Son {days.length} gün · Bakı vaxtı</span></div><div className="activity-bars" role="img" aria-label="Son 30 gün ərzində sual sayı; hər günün rəqəmləri aşağıdakı cədvəldədir">{days.map((d,i) => <div key={d.day} title={`${d.day}: ${d.total ?? 0} sual, ${d.correct ?? 0} düzgün`}><b style={{height:`${Math.max(3,130*(d.total ?? 0)/maximum)}px`}}><i style={{height:`${d.total ? 100*(d.correct ?? 0)/d.total : 0}%`}} /></b><small>{i%5===0 || i===days.length-1 ? d.day.slice(8) : ""}</small></div>)}</div><p className="chart-legend"><span>● Düzgün</span><span>● Səhv</span><span>Fəaliyyətsiz günlər: 0</span></p><details className="daily-data"><summary>Günlük rəqəmləri aç</summary><div className="table-scroll"><table><caption className="sr-only">Günlər üzrə həll edilən suallar</caption><thead><tr><th>Tarix</th><th>Sual</th><th>Düzgün</th><th>Səhv</th></tr></thead><tbody>{days.map(d => <tr key={d.day}><td>{d.day}</td><td>{d.total ?? 0}</td><td>{d.correct ?? 0}</td><td>{(d.total ?? 0)-(d.correct ?? 0)}</td></tr>)}</tbody></table></div></details></section>
    <section className="dashboard-panel"><div className="dashboard-section-title"><div><p className="eyebrow">03 / NÖVBƏTİ ADDIM</p><h2>Qayıtmağa dəyər.</h2></div></div>{weak.length ? <ul className="weak-topic-list">{weak.map(t => <li key={`${t.subject}-${t.grade}-${t.topic}`}><div><small>{t.subject} · {t.grade}-ci sinif</small><strong>{t.topic}</strong><p>{t.total-t.correct} səhv / {t.total} sual · {percent(t.correct,t.total)}{t.total<5 ? " · az sual, əlavə məşq et" : ""}</p></div><Link href={`/onboarding?subject=${encodeURIComponent(t.subject)}&grade=${t.grade}`} aria-label={`${t.subject}: ${t.topic} mövzusunu məşq et`}><ArrowUpRight size={20} /></Link></li>)}</ul> : <div className="dashboard-empty"><Target size={30} /><h3>{totals?.questions ? "Bu seçimdə səhv qeydə alınmayıb." : "İlk addımın yerini sən seç."}</h3><p>{totals?.questions ? "Daha çox mövzu ilə biliyini yoxlamağa davam et." : "Sınaq tamamladıqda təkrar etməli olduğun mövzular burada görünəcək."}</p><Link className="text-link" href="/onboarding">Məşqə başla →</Link></div>}</section></div>
    <section className="dashboard-panel dashboard-history"><div className="dashboard-section-title"><div><p className="eyebrow">04 / NƏTİCƏ TARİXÇƏSİ</p><h2>Əvvəlki sınaqların.</h2><p>Tarixə görə yenidən köhnəyə · {ready ? totalRows : 0} nəticə</p></div><button className="history-export" disabled={!ready || !rows.length} onClick={() => { const url=URL.createObjectURL(new Blob([attemptsCsv(rows)],{type:"text/csv;charset=utf-8"})); const a=document.createElement("a"); a.href=url;a.download=`kairo-neticeler-sehife-${page+1}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);trackActivity("history.exported",{count:rows.length}); }}><Download size={16} />Bu səhifəni CSV yüklə</button></div>
    {ready && rows.length ? <div className="history-list">{rows.map(r => <details key={r.attempt_id}><summary><span className="history-date">{dateLabel(r.submitted_at)}<small>{r.kind === "mini" ? "Mini məşq" : "Sınaq"}</small></span><span><strong>{r.subject}</strong><small>{r.grade}-ci sinif · {r.total} sual</small></span><span className="history-score">{percent(r.correct,r.total)}<small>{r.correct} düz · {r.total-r.correct} səhv</small></span><span>{r.duration_seconds === null ? "Vaxt ölçülməyib" : `${Math.floor(r.duration_seconds/60)} dəq ${r.duration_seconds%60} san`}<small>Mövzuları aç ↓</small></span></summary><div className="history-topics">{r.topic_scores.map(t => <div key={t.topic}><span>{t.topic}</span><strong>{t.correct}/{t.total} · {percent(t.correct,t.total)}</strong></div>)}</div></details>)}</div> : <div className="dashboard-empty"><CalendarDays size={28} /><h3>{status === "ready" ? "Bu seçimə uyğun sınaq yoxdur." : "Tarixçən burada toplanacaq."}</h3><p>Fənn, sinif və tarix süzgəclərini dəyişə və ya yeni sınaq başlada bilərsən.</p></div>}
    <div className="history-pagination"><button disabled={page===0 || !ready} onClick={() => setPage(p=>p-1)}>← Əvvəlki</button><span>{page+1} / {Math.max(1,Math.ceil(totalRows/12))}</span><button disabled={!ready || (page+1)*12>=totalRows} onClick={() => setPage(p=>p+1)}>Növbəti →</button></div></section>
    <p className="dashboard-footnote">{savedAt ? `Bazadan yeniləndi: ${savedAt}. ` : ""}Müddət yalnız ölçülmüş sınaqlardan hesablanır. Göstəricilər məşq nəticələridir. Hər fənn ayrıca qeydə alınır; çoxfənli sınaq bir neçə nəticə yaradır.</p>
  </div>;
}
