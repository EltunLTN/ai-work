"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export function MotionSystem({ children }: { children: ReactNode }) {
  const path = usePathname();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || !window.IntersectionObserver) return;
    const seen = new WeakSet<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }, { threshold: .08 });
    const artwork = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle("decoration-sleep", !e.isIntersecting)));
    const collect = () => {
      root.current?.querySelectorAll<HTMLElement>("[data-reveal], .workspace main > section, .workspace main > .grid, .workspace main > .kairo-card").forEach(element => {
        if (seen.has(element) || element.closest(".kairo-module-main") || element.matches(".kairo-hub-widget")) return;
        seen.add(element); element.classList.add("reveal-ready"); observer.observe(element);
      });
      root.current?.querySelectorAll(".rabbit-artwork,.closing-portal,.time-rabbit").forEach(element => artwork.observe(element));
    };
    collect();
    const changes = new MutationObserver(collect);
    changes.observe(root.current, { childList: true, subtree: true });
    return () => { observer.disconnect(); artwork.disconnect(); changes.disconnect(); };
  }, [path]);
  useEffect(() => {
    const pause = () => document.documentElement.classList.toggle("motion-paused", document.hidden);
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  return <div ref={root} className={path === "/" ? "site-surface" : "site-surface workspace"} data-route={path}><div key={path} className="route-arrival">{children}</div></div>;
}
