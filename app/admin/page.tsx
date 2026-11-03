"use client";

import { ActivityJournal } from "@/components/admin/activity-journal";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Megaphone, RefreshCw } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { ControlCenter } from "@/components/admin/control-center";
import { AccountManager } from "@/components/admin/account-manager";

type Snapshot = { user_id: string; updated_at: string; data: Record<string, unknown> };
type Profile = { grade?: string; subject?: string; name?: string };

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "denied" | "ready" | "error">("loading");
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [count, setCount] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const load = useCallback(async (index: number) => {
    setBusy(true);
    try {
      const db = getSupabase();
      const { data: { user } } = await db.auth.getUser();
      if (!user) { setState("denied"); return; }
      const { data: admin, error: roleError } = await db.rpc("is_admin");
      if (roleError) throw roleError;
      if (admin !== true) { setRows([]); setState("denied"); return; }
      const [snapshots, settings] = await Promise.all([
        db.from("learning_snapshots").select("user_id,updated_at,data", { count: "exact" }).order("updated_at", { ascending: false }).range(index * 20, index * 20 + 19),
        db.from("site_settings").select("announcement").eq("id", 1).single(),
      ]);
      if (snapshots.error || settings.error) throw new Error("load");
      setRows(snapshots.data); setCount(snapshots.count ?? 0); setAnnouncement(settings.data.announcement); setPage(index); setState("ready");
    } catch { setState("error"); setMessage("Məlumatlar yüklənmədi. Yenidən cəhd edin."); }
    finally { setBusy(false); }
  }, []);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => { if (active) void load(0); });
    return () => { active = false; };
  }, [load]);

  return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-4 py-12">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-red-400"><ShieldCheck className="size-4" />KairoLTN1 · Admin</p><h1 className="mt-3 text-3xl font-bold md:text-4xl">İdarəetmə paneli</h1><p className="mt-3 text-zinc-400">İstifadəçilər, təhsil məlumatları, AI istifadəsi və bütün tətbiq alətləri.</p></div><Button variant="secondary" disabled={busy} onClick={() => void load(page)}><RefreshCw className="mr-2 size-4" />Yenilə</Button></div>
    {state === "loading" ? <p role="status">İcazə yoxlanılır…</p> : state === "denied" ? <section className="rounded-3xl border border-white/10 p-8"><h2 className="text-xl font-semibold">Administrator girişi tələb olunur</h2><p className="my-4 text-zinc-400">Yalnız təsdiqlənmiş administrator hesabı bu paneli aça bilər.</p><Link className="text-red-400" href="/account">Hesaba daxil ol →</Link></section> : state === "ready" ? <>
      <ControlCenter /><ActivityJournal />
      <section id="admin-announcement" className="rounded-3xl border border-white/10 bg-white/5 p-6"><h2 className="mb-4 flex items-center gap-2 text-xl font-semibold"><Megaphone className="size-5 text-red-400" />Sayt elanı</h2><label htmlFor="announcement" className="text-sm text-zinc-400">Ana səhifədə göstərilən mesaj. Gizlətmək üçün boş saxlayın.</label><textarea id="announcement" maxLength={500} rows={3} value={announcement} onChange={e => setAnnouncement(e.target.value)} className="mt-3 w-full rounded-xl border border-white/15 bg-black/20 p-4" /><div className="mt-3 flex items-center justify-between"><span className="text-xs text-zinc-500">{announcement.length}/500</span><Button disabled={busy} onClick={async () => {
        setBusy(true); setMessage("");
        try {
          const { data, error } = await getSupabase().from("site_settings").update({ announcement: announcement.trim(), updated_at: new Date().toISOString() }).eq("id", 1).select("id");
          if (error || !data?.length) throw new Error("save");
          setMessage("Elan saxlanıldı və ana səhifədə yeniləndi.");
        } catch { setMessage("Elan saxlanmadı. İcazəni və bağlantını yoxlayın."); }
        finally { setBusy(false); }
      }}>Elanı saxla</Button></div></section>
      <AccountManager />
      <section className="overflow-hidden rounded-3xl border border-white/10"><div className="p-6"><h2 className="text-xl font-semibold">Son saxlanan iş nüsxələri</h2><p className="mt-2 text-sm text-zinc-400">Tam irəliləyiş yuxarıdakı hesab analitikasında göstərilir.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-y border-white/10 bg-white/5 text-zinc-400"><tr>{["Hesab ID", "Sinif", "Fənn", "Son sınaqlar", "Son saxlama"].map(label => <th key={label} className="px-6 py-4 font-medium" scope="col">{label}</th>)}</tr></thead><tbody>{rows.map(row => {
        const profile = (row.data["kairo.profile"] ?? {}) as Profile;
        const attempts = row.data["kairo.attempts"];
        return <tr key={row.user_id} className="border-b border-white/5"><td className="px-6 py-4 font-mono text-xs" title={row.user_id}>{row.user_id.slice(0, 8)}…</td><td className="px-6 py-4">{String(profile.grade ?? "—")}</td><td className="px-6 py-4">{String(profile.subject ?? "—")}</td><td className="px-6 py-4">{Array.isArray(attempts) ? attempts.length : 0}</td><td className="whitespace-nowrap px-6 py-4">{new Date(row.updated_at).toLocaleString("az-AZ", { timeZone: "Asia/Baku" })}</td></tr>;
      })}</tbody></table>{!rows.length && <p className="p-8 text-center text-zinc-400">Hələ saxlanmış şagird məlumatı yoxdur.</p>}</div><div className="flex items-center justify-between p-6"><Button variant="secondary" disabled={busy || page === 0} onClick={() => void load(page - 1)}>Əvvəlki</Button><span className="text-sm text-zinc-400">Səhifə {page + 1}</span><Button variant="secondary" disabled={busy || (page + 1) * 20 >= count} onClick={() => void load(page + 1)}>Növbəti</Button></div></section>
    </> : <Button disabled={busy} onClick={() => void load(page)}>Yenidən yoxla</Button>}
    {message && <p role="status" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm">{message}</p>}
  </main><Footer /></div>;
}
