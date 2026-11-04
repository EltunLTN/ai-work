"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
export async function kairo<T>(
  operation: string,
  payload: object = {},
): Promise<T> {
  const extended = operation.startsWith("platform.");
  const learning = operation.startsWith("learning.");
  const { data, error } = await getSupabase().rpc(learning ? "learning_api" : extended ? "platform_api" : "kairo_api", {
    operation: learning ? operation.slice(9) : extended ? operation.slice(9) : operation,
    payload,
  });
  if (error)
    throw new Error(
      error.code === "42501"
        ? (error.message.includes("tapılmadı") ? "Bu yarış tapılmadı və ya onun iştirakçısı deyilsən. Admin nəticələri İdarəetmə mərkəzində açılır." : error.message.includes("Sessiya bitib") ? "Sessiya bitib. Hesab bölməsindən yenidən daxil ol." : error.message.includes("dayandırılıb") ? "Hesab istifadəsi dayandırılıb. Administratorla əlaqə saxla." : error.message.includes("Təsdiqlənmiş") ? "E-poçtunu təsdiqlə və hesabına yenidən daxil ol." : "Bu məlumata giriş icazən yoxdur. Öz hesabınla daxil olduğunu yoxla.")
        : error.message,
    );
  return data as T;
}
export function useKairo<T>(operation: string, payload: object = {}, poll = 0) {
  const key = JSON.stringify(payload);
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState(""),
    [status, setStatus] = useState("loading"),
    [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    let running = false;
    let identityVersion = 0;
    let signedOut = false;
    async function load() {
      if (running || signedOut) return;
      running = true;
      const loadVersion = identityVersion;
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!active || loadVersion !== identityVersion) return;
        if (!session) {
          setData(null);
          setStatus("guest");
          return;
        }
        const result = await kairo<T>(operation, JSON.parse(key));
        if (active && loadVersion === identityVersion) {
          setData(result);
          setError("");
          setStatus("ready");
        }
      } catch (e) {
        if (active && loadVersion === identityVersion) {
          setData(null);
          setError(e instanceof Error ? e.message : "Bağlantı alınmadı.");
          setStatus("error");
        }
      } finally {
        running = false;
        if (active && !signedOut && loadVersion !== identityVersion) void load();
      }
    }
    void load();
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_OUT" && event !== "SIGNED_IN") return;
      identityVersion += 1;
      signedOut = !session;
      queueMicrotask(() => {
        if (!active) return;
        setData(null);
        setError("");
        setStatus(session ? "loading" : "guest");
        if (session) void load();
      });
    });
    const timer = poll
      ? setInterval(() => {
          if (!document.hidden) void load();
        }, poll)
      : null;
    const online = () => void load();
    window.addEventListener("online", online);
    return () => {
      active = false;
      if (timer) clearInterval(timer);
      subscription.unsubscribe();
      window.removeEventListener("online", online);
    };
  }, [operation, key, poll, revision]);
  return { data, error, status, refresh, setData };
}
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function dateTime(value: string) {
  return new Date(value).toLocaleString("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
export function clock(seconds: number) {
  const n = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${(n % 60).toString().padStart(2, "0")}`;
}
export const KAIRO_ROUTES = [
  {
    href: "/kairo/exam",
    label: "İmtahan simulyatoru",
    short: "İmtahan",
    icon: "exam",
  },
  {
    href: "/kairo/tutor",
    label: "AI müəllim",
    short: "AI müəllim",
    icon: "tutor",
  },
  {
    href: "/kairo/university-goals",
    label: "Universitet hədəfim",
    short: "Hədəflər",
    icon: "goal",
  },
  {
    href: "/kairo/focus",
    label: "Fokus rejimi",
    short: "Fokus",
    icon: "focus",
  },
  { href: "/kairo/duel", label: "Kairo Duel", short: "Duel", icon: "duel" },
  { href: "/kairo/arena", label: "Kairo Arena", short: "Arena", icon: "arena" },
  { href: "/kairo/lab", label:"Virtual laboratoriya",short:"Laboratoriya",icon:"lab" },
  { href: "/kairo/mistakes", label:"Səhv analizi və təkrar izləmə",short:"Təhlil",icon:"mistakes" },
] as const;

