"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  Focus,
  GraduationCap,
  Swords,
  Trophy,
} from "lucide-react";
import { KAIRO_ROUTES } from "@/lib/kairo/client";
import type { PublicPlayer } from "@/lib/kairo/types";
const icons = {
  exam: BookOpen,
  tutor: Brain,
  goal: GraduationCap,
  focus: Focus,
  duel: Swords,
  arena: Trophy,
};
export function KairoAccountBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [owner, setOwner] = useState("initial");
  useEffect(() => {
    let live = true;
    const db = getSupabase();
    void db.auth.getSession().then(({ data }) => {
      if (live) setOwner(data.session?.user.id ?? "guest");
    });
    const { data } = db.auth.onAuthStateChange((_event, session) => {
      queueMicrotask(() => {
        if (live) setOwner(session?.user.id ?? "guest");
      });
    });
    return () => {
      live = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return <div key={owner}>{children}</div>;
}
export function ModuleIcon({
  name,
  size = 22,
}: {
  name: keyof typeof icons;
  size?: number;
}) {
  const Icon = icons[name];
  return <Icon size={size} />;
}
export function KairoNavigation() {
  const path = usePathname();
  return (
    <nav className="kairo-module-nav" aria-label="Kairo alətləri">
      <Link href="/kairo" className="kairo-module-brand">
        Kairo / alətlər
      </Link>
      <div>
        {KAIRO_ROUTES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            aria-current={path.startsWith(r.href) ? "page" : undefined}
          >
            <ModuleIcon name={r.icon} size={16} />
            {r.short}
          </Link>
        ))}
      </div>
    </nav>
  );
}
export function ModuleHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="module-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}
export function ModuleStatus({
  status,
  error,
  retry,
}: {
  status: string;
  error: string;
  retry: () => void;
}) {
  const path = usePathname();
  if (status === "ready") return null;
  return (
    <section
      className="module-status"
      role={status === "error" ? "alert" : "status"}
    >
      {status === "guest" ? (
        <>
          <GraduationCap size={30} />
          <h2>Öyrənmə yoluna hesabınla davam et.</h2>
          <p>
            Şəxsi nəticələr, canlı yarışlar və dərslər təsdiqlənmiş hesaba
            bağlıdır.
          </p>
          <Link
            className="editorial-button"
            href={`/account?next=${encodeURIComponent(path)}`}
          >
            Hesaba daxil ol <ArrowUpRight size={17} />
          </Link>
        </>
      ) : status === "error" ? (
        <>
          <h2>Məlumat yüklənmədi.</h2>
          <p>{error}</p>
          <button className="module-button" onClick={retry}>
            Yenidən cəhd et
          </button>
        </>
      ) : (
        <>
          <span className="module-spinner" />
          <p>Məlumatlar bazadan yüklənir…</p>
        </>
      )}
    </section>
  );
}
export function LockedSurface({ active }: { active: boolean }) {
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("kairo-locked");
    return () => document.documentElement.classList.remove("kairo-locked");
  }, [active]);
  return null;
}
export function PlayerAvatar({
  player,
  size = 46,
}: {
  player: PublicPlayer | null;
  size?: number;
}) {
  return (
    <span
      className="player-avatar"
      style={{
        width: size,
        height: size,
        background: player?.color ?? "#5b665f",
      }}
      aria-hidden="true"
    >
      {player?.nickname?.slice(0, 2).toLocaleUpperCase("az") ?? "?"}
    </span>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={`module-notice ${error ? "is-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
