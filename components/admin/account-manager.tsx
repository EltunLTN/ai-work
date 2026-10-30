"use client";

import { useEffect, useState } from "react";
import { aiFetch, getSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ProgressPanel } from "@/components/dashboard/progress-panel";

type Account = { id: string; email: string; first_name: string; last_name: string; grade: string | null; suspended: boolean; admin_note: string; created_at: string };
export function AccountManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selected, setSelected] = useState<Account | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [audit, setAudit] = useState<Array<{ id: number; target_id: string; created_at: string }>>([]);
  useEffect(() => {
    let active = true;
    void (async () => {
      const db = getSupabase();
      const [users, changes] = await Promise.all([db.rpc("admin_accounts"), db.from("admin_audit").select("id,target_id,created_at").order("created_at", { ascending: false }).limit(10)]);
      if (!active) return;
      if (users.error || changes.error) { setMessage("Hesablar yüklənmədi. İcazəni və bağlantını yoxlayın."); return; }
      setAccounts(users.data ?? []); setAudit(changes.data ?? []);
    })().catch(() => { if (active) setMessage("Bağlantı xətası."); });
    return () => { active = false; };
  }, [revision]);
  const query = search.toLocaleLowerCase("az");
  const matches = accounts.filter(a => `${a.first_name} ${a.last_name} ${a.email}`.toLocaleLowerCase("az").includes(query));
  return <section className="space-y-6"><div className="flex flex-wrap gap-3"><Button disabled={busy} variant="secondary" onClick={async () => {
    setBusy(true); setMessage("Model canlı sorğu ilə yoxlanılır…");
    try { const response = await aiFetch("/api/admin/model-check", { method: "POST" }); const result = await response.json(); setMessage(response.ok ? result.message : `${result.error} ${result.code ?? ""}`); }
    catch { setMessage("Model yoxlanmadı. Bağlantını yoxlayın."); } finally { setBusy(false); }
  }}>AI bağlantısını yoxla</Button></div><div className="kairo-card rounded-3xl p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold">Hesablar və irəliləyiş</h2><p className="kairo-muted mt-2 text-sm">Son {accounts.length} hesab. Şagirdi seçərək bütün fənlər üzrə analitikanı aç və profilini idarə et.</p></div><Button variant="secondary" onClick={() => setRevision(v => v + 1)}>Siyahını yenilə</Button></div><label className="mt-5 block text-sm">Ad, soyad və ya e-poçtla axtar<input type="search" className="account-field" value={search} onChange={e => setSearch(e.target.value)} /></label><div className="mt-4 max-h-80 overflow-auto rounded-xl border border-[var(--card-border)]">{matches.map(a => <button key={a.id} type="button" onClick={() => { setSelected({ ...a }); setMessage(""); }} className={`flex w-full flex-wrap items-center justify-between gap-2 border-b border-[var(--card-border)] px-4 py-4 text-left text-sm transition hover:bg-white/5 ${selected?.id === a.id ? "bg-red-400/10" : ""}`}><span><strong className="block">{`${a.first_name} ${a.last_name}`.trim() || "Ad əlavə edilməyib"}</strong><span className="kairo-muted text-xs">{a.email}</span></span><span className={a.suspended ? "text-red-400" : "text-emerald-400"}>{a.suspended ? "AI dayandırılıb" : "Aktiv"} · {a.grade ? `${a.grade}-ci sinif` : "Sinif yoxdur"}</span></button>)}{!matches.length && <p className="kairo-muted p-5">Hesab tapılmadı.</p>}</div></div>
    {selected && <><form className="kairo-card rounded-3xl p-6" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage("");
      try {
        const { error } = await getSupabase().rpc("admin_update_account", { target: selected.id, given_name: selected.first_name, family_name: selected.last_name, school_grade: selected.grade ?? "", is_suspended: selected.suspended, note: selected.admin_note });
        if (error) throw error;
        setMessage("Dəyişiklik saxlanıldı və audit jurnalına yazıldı."); setRevision(v => v + 1);
      } catch { setMessage("Dəyişiklik saxlanmadı. Öz admin hesabının AI girişini dayandırmaq olmaz."); }
      finally { setBusy(false); }
    }}><h3 className="font-semibold">Hesabı redaktə et</h3><p className="kairo-muted mt-2 break-all text-xs">{selected.email} · {selected.id}</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm">Ad<input className="account-field" maxLength={60} value={selected.first_name} onChange={e => setSelected({ ...selected, first_name: e.target.value })} /></label><label className="text-sm">Soyad<input className="account-field" maxLength={60} value={selected.last_name} onChange={e => setSelected({ ...selected, last_name: e.target.value })} /></label><label className="text-sm">Sinif<select className="account-field" value={selected.grade ?? ""} onChange={e => setSelected({ ...selected, grade: e.target.value || null })}><option value="">Seçilməyib</option>{Array.from({ length: 11 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label></div><label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={selected.suspended} onChange={e => setSelected({ ...selected, suspended: e.target.checked })} />Bu hesab üçün AI istifadəsini dayandır</label><p className="kairo-muted mt-2 text-xs">Hesaba giriş və əvvəlki nəticələrə baxış açıq qalır. Yeni AI sorğuları bloklanır.</p><label className="mt-4 block text-sm">Admin qeydi<textarea className="account-field" maxLength={1000} rows={3} value={selected.admin_note} onChange={e => setSelected({ ...selected, admin_note: e.target.value })} /></label><Button disabled={busy} className="mt-4" type="submit">{busy ? "Saxlanılır…" : "Dəyişiklikləri saxla"}</Button></form><div key={selected.id}><h3 className="mb-5 text-xl font-semibold">{selected.first_name || selected.email} · təhsil analitikası</h3><ProgressPanel target={selected.id} /></div></>}
    {message && <p role="status" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm">{message}</p>}
    <details className="kairo-card rounded-2xl p-5"><summary className="cursor-pointer text-sm">Son admin dəyişiklikləri ({audit.length})</summary><ul className="kairo-muted mt-4 space-y-2 text-xs">{audit.map(a => <li key={a.id}>Hesab {a.target_id.slice(0, 8)}… · {new Date(a.created_at).toLocaleString("az-AZ", { timeZone: "Asia/Baku" })}</li>)}</ul></details>
  </section>;
}
