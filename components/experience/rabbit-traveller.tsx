"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { WhiteRabbit, type RabbitState } from "./white-rabbit";
const RabbitCanvas = dynamic(() => import("./rabbit-canvas"), { ssr: false, loading: () => <WhiteRabbit /> });

/** One character travels from the hero into the existing companion's hit target. */
export function RabbitTraveller({ state, reduced, home, quiet }: { state: RabbitState; reduced: boolean; home: boolean; quiet: boolean }) {
  const [docked, setDocked] = useState(!home || reduced);
  const [landed, setLanded] = useState(!home || reduced);
  const [box, setBox] = useState<{ x: number; y: number; scale: number } | null>(null);
  useEffect(() => {
    document.documentElement.classList.add("has-cinematic-rabbit");
    return () => document.documentElement.classList.remove("has-cinematic-rabbit");
  }, []);
  useEffect(() => {
    if (!home || reduced) { queueMicrotask(() => setDocked(true)); queueMicrotask(() => setLanded(true)); return; }
    queueMicrotask(() => { setDocked(false); setLanded(false); });
    const timer = setTimeout(() => setDocked(true), 3600);
    const land = setTimeout(() => setLanded(true), 5200);
    const leave = () => { if (scrollY > 90) setDocked(true); };
    window.addEventListener("scroll", leave, { passive: true });
    return () => { clearTimeout(timer); clearTimeout(land); window.removeEventListener("scroll", leave); };
  }, [home, reduced]);
  useEffect(() => {
    const measure = () => {
      const anchor = document.querySelector(docked ? ".rabbit-launcher .white-rabbit" : ".hero-rabbit");
      const rect = anchor?.getBoundingClientRect();
      if (rect?.width && rect.height) setBox({ x: rect.left + rect.width / 2 - 150, y: rect.top + rect.height / 2 - 195, scale: Math.min(rect.width / 300, rect.height / 390) });
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure); if (document.body) observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [docked, state, quiet]);
  if (!box) return null;
  return <motion.div className={`rabbit-traveller ${docked ? "traveller-docked" : "traveller-hero"}`} aria-hidden="true" initial={false} animate={{ x: box.x, y: box.y, scale: box.scale, rotate: docked ? 0 : -5 }} transition={{ duration: reduced ? 0 : 1.6, ease: [.45, 0, .15, 1] }}><RabbitCanvas state={docked ? landed ? state : "running" : "attention"} reduced={reduced} /></motion.div>;
}
