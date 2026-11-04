"use client";
import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
export async function kairo<T>(
  operation: string,
  payload: object = {},
): Promise<T> {
  const extended = operation.startsWith("platform.");
  const { data, error } = await getSupabase().rpc(extended ? "platform_api" : "kairo_api", {
    operation: extended ? operation.slice(9) : operation,
    payload,
  });
  if (error)
    throw new Error(
      error.code === "42501"
        ? "Bu əməliyyat üçün təsdiqlənmiş hesab və uyğun icazə tələb olunur."
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
    async function load() {
      if (running) return;
      running = true;
      try {
        const {
          data: { session },
        } = await getSupabase().auth.getSession();
        if (!active) return;
        if (!session) {
          setData(null);
          setStatus("guest");
          return;
        }
        const result = await kairo<T>(operation, JSON.parse(key));
        if (active) {
          setData(result);
          setError("");
          setStatus("ready");
        }
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Bağlantı alınmadı.");
          setStatus("error");
        }
      } finally {
        running = false;
      }
    }
    void load();
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
] as const;
