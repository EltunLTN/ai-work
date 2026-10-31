"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { Cloud, Download, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { WorkspaceHeading } from "@/components/layout/workspace-heading";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase/client";
import { clearLearningData, restoreFromCloud, saveToCloud } from "@/lib/cloud-storage";
import { ProfileEditor } from "@/components/account/profile-editor";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [signup, setSignup] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    try {
      const db = getSupabase();
      void db.auth.getUser().then(async ({ data }) => {
        if (!active) return;
        setUser(data.user);
        if (data.user) {
          const { data: isAdmin } = await db.rpc("is_admin");
          if (active) setAdmin(isAdmin === true);
        }
        if (active) setLoading(false);
      }).catch(() => { if (active) { setMessage("Hesab xidməti ilə əlaqə qurulmadı."); setLoading(false); } });
      const { data: listener } = db.auth.onAuthStateChange((event, session) => {
        if (!active) return;
        setUser(session?.user ?? null);
        if (event === "PASSWORD_RECOVERY") setRecovery(true);
      });
      return () => { active = false; listener.subscription.unsubscribe(); };
    } catch (error) {
      queueMicrotask(() => { if (active) { setMessage((error as Error).message); setLoading(false); } });
    }
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
    setBusy(true); setMessage("");
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "Əməliyyat alınmadı."); }
    finally { setBusy(false); }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(async () => {
      const db = getSupabase();
      if (recovery) {
        const { error } = await db.auth.updateUser({ password });
        if (error) throw new Error("Şifrə yenilənmədi. Ən azı 10 simvol istifadə edin.");
        setRecovery(false); setPassword(""); setMessage("Şifrəniz yeniləndi."); return;
      }
      if (signup) {
        const { error } = await db.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: `${window.location.origin}/account` } });
        if (error) throw new Error("Qeydiyyat alınmadı. Ünvanı yoxlayın və bir az sonra yenidən cəhd edin.");
        setMessage("E-poçtunuza göndərilən təsdiq keçidini açın, sonra hesabınıza daxil olun."); setSignup(false); setPassword("");
      } else {
        const { data, error } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error("E-poçt və ya şifrə yanlışdır, yaxud e-poçt təsdiqlənməyib.");
        // A different account must never inherit another student's browser records.
        const previousOwner = localStorage.getItem("kairo.cloud.owner");
        if (previousOwner && previousOwner !== data.user.id) clearLearningData();
        localStorage.setItem("kairo.cloud.owner", data.user.id);
        const { data: isAdmin } = await db.rpc("is_admin");
        setAdmin(isAdmin === true); setUser(data.user); setPassword("");
        setMessage("Daxil oldunuz. Təhsil məlumatlarınız avtomatik yüklənir və saxlanır.");
      }
    });
  }

  return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 md:py-20">
    <WorkspaceHeading index="07 / HESABIN" title="Təhsil yolun, bir yerdə." description="Profilin, nəticələrin və fərdi planın. Harada olursan ol, qaldığın yerdən davam et." />
    {user && <ProfileEditor userId={user.id} />}
    {loading ? <p role="status">Hesab yoxlanılır…</p> : <div className="grid gap-6 md:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
        <UserRound className="mb-5 size-8 text-red-400" /><h2 className="text-xl font-semibold">{recovery ? "Yeni şifrə" : user ? "Hesabın" : signup ? "Hesab yarat" : "Xoş gəldin"}</h2>
        {user && !recovery ? <div className="mt-5 space-y-5"><p className="break-all text-zinc-300">{user.email}</p><p className="text-sm text-zinc-400">E-poçt təsdiqlənib · {admin ? "Administrator" : "Şagird"}</p>{admin && <Link className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-5 py-3 font-semibold text-white" href="/admin"><ShieldCheck className="size-4" />Admin paneli</Link>}<div><Button disabled={busy} variant="secondary" onClick={() => void run(async () => {
          await saveToCloud();
          const { error } = await getSupabase().auth.signOut(); if (error) throw error;
          clearLearningData(); localStorage.removeItem("kairo.cloud.owner"); setUser(null); setAdmin(false); setMessage("Hesabdan çıxıldı. Bu cihazdakı təhsil məlumatları təmizləndi.");
        })}><LogOut className="mr-2 size-4" />Çıxış</Button></div><p className="text-xs text-zinc-500">Çıxışdan əvvəl məlumatların bazaya saxlanır. Çıxış cihazdakı təhsil məlumatlarını təmizləyir.</p></div> : <form onSubmit={submit} className="mt-6 space-y-4">
          {!recovery && <label className="block text-sm">E-poçt<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" /></label>}
          <label className="block text-sm">Şifrə<input type="password" required minLength={signup || recovery ? 10 : 1} maxLength={128} autoComplete={signup || recovery ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-3" /></label>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Gözləyin…" : recovery ? "Şifrəni yenilə" : signup ? "Qeydiyyatdan keç" : "Daxil ol"}</Button>
          {!recovery && <><button type="button" disabled={busy} className="text-sm text-red-400" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Hesabın var? Daxil ol" : "Yeni hesab yarat"}</button><button type="button" disabled={busy} className="block text-sm text-zinc-400" onClick={() => void run(async () => {
            if (!email.includes("@")) throw new Error("Əvvəlcə e-poçt ünvanını daxil edin.");
            const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/account` });
            if (error) throw new Error("Sorğu göndərilmədi. Bir az sonra yenidən cəhd edin.");
            setMessage("Hesab mövcuddursa, şifrə bərpa keçidi e-poçtunuza göndərildi.");
          })}>Şifrəni unutmusunuz?</button></>}
        </form>}
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8"><Cloud className="mb-5 size-8 text-red-400" /><h2 className="text-xl font-semibold">Bulud yaddaşı</h2><p className="mt-4 text-sm leading-6 text-zinc-400">Profil, sınaq nəticələri, cavablar, fəaliyyət tarixçəsi və təhsil planı yalnız sənin hesabına bağlı saxlanılır. Dəyişikliklər avtomatik bazaya yazılır. Bağlantı kəsilsə, yenidən qoşulanda təkrar göndərilir.</p><div className="mt-6 flex flex-wrap gap-3"><Button disabled={!user || busy} onClick={() => void run(async () => { await saveToCloud(); setMessage("Təhsil məlumatların bazada saxlanıldı."); })}><Cloud className="mr-2 size-4" />Bazaya saxla</Button><Button disabled={!user || busy} variant="secondary" onClick={() => {
        if (!window.confirm("Bu cihazdakı təhsil məlumatları bazadakı nüsxə ilə əvəzlənəcək. Davam edilsin?")) return;
        void run(async () => { await restoreFromCloud(); setMessage("Məlumatlar bərpa olundu. Dashboard-a keçə bilərsiniz."); });
      }}><Download className="mr-2 size-4" />Bərpa et</Button></div><Link href="/dashboard" className="mt-6 inline-block text-sm text-red-400">Dashboard-a keç →</Link><p className="mt-6 text-xs leading-5 text-zinc-500">Bərpa bu cihazdakı təhsil məlumatlarını əvəz edir. Tema və dil seçimin saxlanılır.</p></section>
    </div>}
    {message && <p role="status" aria-live="polite" className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm">{message}</p>}
  </main><Footer /></div>;
}
