"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { clearLearningData, restoreFromCloud, saveToCloud } from "@/lib/cloud-storage";
import { STORAGE_CHANGE_EVENT } from "@/lib/storage";

export const CLOUD_STATUS_EVENT = "kairo:cloud-status";
export function CloudProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const pathname = usePathname();
  const learningPage = ["/quiz", "/mini-quiz", "/results", "/plan", "/dashboard", "/onboarding"].includes(pathname);
  useEffect(() => {
    let active = true, initialized: string | null | undefined, userId: string | null = null, version = 0, saving = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const announce = (text: string) => { if (active) { setStatus(text); window.dispatchEvent(new CustomEvent(CLOUD_STATUS_EVENT, { detail: text })); } };
    const dirtyKey = () => `kairo.cloud.dirty.${userId}`;
    async function sync() {
      if (!active || !userId || saving) return;
      saving = true;
      const revision = version;
      announce("Saxlanılır…");
      try {
        await saveToCloud();
        if (!active) return;
        if (revision === version) { localStorage.removeItem(dirtyKey()); announce("Bazaya saxlanıldı"); }
      } catch { announce("Saxlanmadı · yenidən cəhd ediləcək"); }
      finally { saving = false; if (active && userId && localStorage.getItem(dirtyKey())) timer = setTimeout(() => void sync(), revision === version ? 15000 : 1000); }
    }
    const changed = () => {
      if (!userId || !active) return;
      version++; localStorage.setItem(dirtyKey(), "1");
      clearTimeout(timer); timer = setTimeout(() => void sync(), 1000);
    };
    async function boot(id: string | null) {
      if (!active || initialized === id) return;
      initialized = id; userId = null;
      if (!id) { if (active) { setReady(true); announce(""); } return; }
      setReady(false);
      const oldOwner = localStorage.getItem("kairo.cloud.owner");
      if (oldOwner && oldOwner !== id) clearLearningData();
      localStorage.setItem("kairo.cloud.owner", id);
      try {
        // Restore before rendering learning pages; unsynced offline work wins on this device.
        if (!localStorage.getItem(`kairo.cloud.dirty.${id}`)) await restoreFromCloud(true);
        if (!active || initialized !== id) return;
        localStorage.setItem(`kairo.cloud.hydrated.${id}`, "1");
        userId = id; setReady(true);
        if (localStorage.getItem(dirtyKey())) await sync();
        else announce("Bulud yaddaşı hazırdır");
      } catch { if (active) {
        if (oldOwner === id && localStorage.getItem(`kairo.cloud.hydrated.${id}`)) { userId = id; setReady(true); announce("Bağlantı yoxdur · məlumat cihazda saxlanır"); }
        else { announce("Hesabın bazadakı məlumatları yüklənmədi. Bağlantını yoxlayıb yenidən cəhd edin."); setReady(false); }
      } }
    }
    let unsubscribe = () => {};
    try {
      const db = getSupabase();
      void db.auth.getSession().then(({ data }) => boot(data.session?.user.id ?? null)).catch(() => { if (active) setReady(true); });
      const listener = db.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => void boot(session?.user.id ?? null)); });
      unsubscribe = () => listener.data.subscription.unsubscribe();
    } catch { queueMicrotask(() => { if (active) setReady(true); }); }
    window.addEventListener(STORAGE_CHANGE_EVENT, changed);
    window.addEventListener("online", changed);
    const flush = () => { if (document.visibilityState === "hidden" && userId) void sync(); };
    document.addEventListener("visibilitychange", flush);
    return () => { active = false; clearTimeout(timer); unsubscribe(); window.removeEventListener(STORAGE_CHANGE_EVENT, changed); window.removeEventListener("online", changed); document.removeEventListener("visibilitychange", flush); };
  }, []);
  if (!ready && learningPage) return <main className="grid min-h-screen place-items-center"><div className="max-w-sm space-y-4 p-6 text-center"><p role="status" className="text-sm text-zinc-400">{status || "Təhsil məlumatların yüklənir…"}</p>{status && <button className="text-sm text-red-400" onClick={() => window.location.reload()}>Yenidən cəhd et →</button>}</div></main>;
  return <>{children}{status && <div role="status" className="cloud-indicator">{status}</div>}</>;
}
