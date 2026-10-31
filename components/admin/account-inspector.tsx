"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { GradeSubjectSelector, TextbookSelector } from "@/components/onboarding/selectors";
import { getDefaultProfile, getProfileForSelection, getTextbookById } from "@/lib/textbook-reference";
import { attemptsCsv } from "@/lib/admin-export";
import type { StudentProfile } from "@/lib/types";

type Attempt = { attempt_id: string; kind: string; subject: string; grade: string; total: number; correct: number; duration_seconds: number | null; submitted_at: string; topic_scores: Array<{ topic: string; total: number; correct: number }> };
type Detail = { profile: { daily_ai_limit: number; avatar_path: string | null } | null; auth: { email: string; confirmed: boolean; last_sign_in_at: string | null; created_at: string }; usage: { requests: number }; learning_profile: StudentProfile | null; plan: { title?: string; days?: Array<{ day: number; topic: string; focus?: string; estimatedMinutes?: number }> } | null; snapshot_updated: string | null; attempts: Attempt[]; audit: Array<{ id: number; created_at: string; change: Record<string, unknown> }> };
const date = (value: string | null) => value ? new Date(value).toLocaleString("az-AZ", { timeZone: "Asia/Baku" }) : "—";

export function AccountInspector({ userId, revision, onChanged }: { userId: string; revision: number; onChanged: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [learning, setLearning] = useState<StudentProfile>(getDefaultProfile);
  const [limit, setLimit] = useState(100);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = getSupabase(); const result = await db.rpc("admin_control", { operation: "detail", target: userId });
      if (!active) return;
      if (result.error) { setMessage("Hesabın detalları yüklənmədi."); return; }
      const detail = result.data as Detail; setData(detail); setLimit(detail.profile?.daily_ai_limit ?? 100); setAvatar("");
      const saved = detail.learning_profile;
      setLearning(saved && getTextbookById(saved.textbookId) ? saved : getDefaultProfile());
      if (detail.profile?.avatar_path) { const { data } = await db.storage.from("avatars").createSignedUrl(detail.profile.avatar_path, 1800); if (active && data) setAvatar(data.signedUrl); }
    })().catch(() => { if (active) setMessage("Bağlantı xətası."); });
    return () => { active = false; };
  }, [userId, revision, version]);
  async function manage(operation: string, payload: unknown = {}) {
    setBusy(true); setMessage("");
    try { const { error } = await getSupabase().rpc("admin_control", { operation, target: userId, payload }); if (error) throw error; setMessage("Əməliyyat tamamlandı və auditə yazıldı."); setVersion(v => v + 1); onChanged(); }
    catch { setMessage("Əməliyyat alınmadı. Seçimi və icazəni yoxlayın."); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      if (file.size > 5000000 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("5 MB-dan kiçik JPG, PNG və ya WebP seçin.");
      const bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
      const side = Math.min(bitmap.width, bitmap.height); canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256); bitmap.close();
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error("Şəkil oxunmadı.")), "image/webp", .85));
      const path = `${userId}/admin-${crypto.randomUUID()}.webp`;
      const db = getSupabase(); const { error } = await db.storage.from("avatars").upload(path, blob, { contentType: "image/webp" }); if (error) throw error;
      const result = await db.rpc("admin_control", { operation: "set_avatar", target: userId, payload: { path } }); if (result.error) throw result.error;
      setVersion(v => v + 1); onChanged(); setMessage("Profil şəkli dəyişdirildi. Əvvəlki fayl saxlanılır.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Şəkil dəyişdirilmədi."); }
    finally { setBusy(false); }
  }
  function exportCsv() {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([attemptsCsv(data.attempts)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `kairo-${userId}-neticeler.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!data) return <p role="status">Hesabın detalları yüklənir… {message}</p>;
  return <div className="account-inspector space-y-6"><section className="kairo-card p-6"><h3 className="text-xl">Hesab və AI nəzarəti</h3><dl className="admin-detail-grid"><div><dt>E-poçt</dt><dd>{data.auth.email}</dd></div><div><dt>Təsdiq</dt><dd>{data.auth.confirmed ? "Təsdiqlənib" : "Gözləyir"}</dd></div><div><dt>Son giriş · Bakı</dt><dd>{date(data.auth.last_sign_in_at)}</dd></div><div><dt>Son bulud nüsxəsi</dt><dd>{date(data.snapshot_updated)}</dd></div><div><dt>Bu gün AI istifadəsi · UTC</dt><dd>{data.usage.requests} / {data.profile?.daily_ai_limit ?? 100}</dd></div><div><dt>Qeydiyyat</dt><dd>{date(data.auth.created_at)}</dd></div></dl><form onSubmit={e => { e.preventDefault(); void manage("ai_limit", { limit }); }} className="flex flex-wrap items-end gap-3"><label className="text-sm">Gündəlik AI limiti<input className="account-field" type="number" min={0} max={100} step={1} required value={limit} onChange={e => setLimit(Number(e.target.value))} /></label><Button disabled={busy}>Limiti saxla</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => void manage("reset_usage")}>Bugünkü istifadə sayını sıfırla</Button></form><p className="kairo-muted mt-3 text-xs">0 yeni AI sorğularını dayandırır. Limit 0–100 aralığındadır; hər sorğu mövcud provayder istifadəsinə daxildir.</p></section>
    <section className="kairo-card p-6"><h3 className="text-xl">Profil şəklini idarə et</h3><div className="mt-5 flex flex-wrap items-center gap-5">{avatar ? <Image src={avatar} unoptimized width={80} height={80} alt="Seçilmiş istifadəçinin profil şəkli" className="rounded-full object-cover" /> : <div className="grid size-20 place-items-center rounded-full border border-[var(--line)] text-xs">Şəkil yoxdur</div>}<label className="text-sm text-[var(--red)]">Yeni şəkil yüklə<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block max-w-full text-xs" disabled={busy} onChange={e => void upload(e.target.files?.[0])} /></label><Button variant="secondary" disabled={busy || !data.profile?.avatar_path} onClick={() => void manage("remove_avatar")}>Şəkli gizlət</Button><Button variant="secondary" disabled={busy} onClick={() => void manage("restore_avatar")}>Əvvəlki şəkli bərpa et</Button></div></section>
    <section className="kairo-card p-6"><h3 className="text-xl">İstifadəçinin təhsil seçimini dəyiş</h3><p className="kairo-muted my-4 text-xs leading-6">Yeni fənn/mövzu seçimi növbəti girişdə və ya buluddan bərpadan sonra yüklənir. Əvvəlki məşq tarixçəsi saxlanır; cari sınaq və plan yeni seçim üçün yenidən hazırlanır.</p><GradeSubjectSelector grade={learning.grade} subject={learning.subject} onChange={({ grade, subject }) => setLearning(getProfileForSelection(grade, subject))} /><div className="mt-5"><TextbookSelector profile={learning} onSelect={id => { const book = getTextbookById(id); if (book) setLearning({ ...learning, textbookId: id, selectedTopics: book.topics.slice(0, 4) }); }} onToggleTopic={topic => setLearning(p => ({ ...p, selectedTopics: p.selectedTopics.includes(topic) ? p.selectedTopics.length > 1 ? p.selectedTopics.filter(t => t !== topic) : [topic] : [...p.selectedTopics, topic] }))} /></div><Button className="mt-5" disabled={busy || learning.selectedTopics.length > 20} onClick={() => void manage("learning_profile", learning)}>Təhsil seçimini saxla</Button></section>
    <section className="kairo-card overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 p-6"><div><h3 className="text-xl">Sınaq tarixçəsi</h3><p className="kairo-muted mt-2 text-xs">Son 100 sınaq · Mövzu detallarını sətri açaraq gör.</p></div><Button variant="secondary" onClick={exportCsv} disabled={!data.attempts.length}>CSV ixrac et</Button></div>{!data.attempts.length ? <p className="kairo-muted px-6 pb-6 text-sm">Hələ sınaq yoxdur.</p> : <div className="admin-attempt-list">{data.attempts.map(a => <details key={a.attempt_id}><summary><strong>{a.subject} · {a.grade}-ci sinif</strong><span>{a.correct}/{a.total} düzgün · {date(a.submitted_at)}</span></summary><div><p>{a.kind === "mini" ? "Mini-test" : "Diaqnostik sınaq"} · {a.total - a.correct} səhv · {a.duration_seconds === null ? "Müddət ölçülməyib" : `${a.duration_seconds} saniyə`}</p>{a.topic_scores.map(t => <p key={t.topic}>{t.topic}: {t.correct}/{t.total} düzgün</p>)}</div></details>)}</div>}</section>
    {data.plan && <details className="kairo-card p-6"><summary className="cursor-pointer">Saxlanmış təhsil planı: {data.plan.title}</summary><ol className="mt-4 space-y-3 text-sm">{data.plan.days?.map(d => <li key={d.day}>{d.day}-ci gün · {d.topic} · {d.estimatedMinutes ?? "—"} dəqiqə</li>)}</ol></details>}
    <details className="kairo-card p-6"><summary className="cursor-pointer">Bu istifadəçi üzrə audit ({data.audit.length})</summary><div className="mt-4 space-y-3">{data.audit.map(a => <details key={a.id}><summary className="cursor-pointer text-xs">{date(a.created_at)} · {String(a.change.operation ?? "Profil redaktəsi")}</summary><pre className="admin-json">{JSON.stringify(a.change, null, 2)}</pre></details>)}</div></details>{message && <p role="status">{message}</p>}
  </div>;
}
