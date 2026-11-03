"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { RabbitTraveller } from "./rabbit-traveller";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { ArrowUpRight, Clock3, Command, Eye, EyeOff, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { WhiteRabbit, type RabbitState } from "./white-rabbit";
import { MotionSystem } from "./motion-system";

const RabbitCanvas = dynamic(() => import("./rabbit-canvas"), { ssr: false, loading: () => <WhiteRabbit /> });

type Scene = "closed" | "choice" | "arrival" | "invitation" | "chase" | "portal" | "reveal";
const destinations = [{ href: "/", label: "Ana səhifə", detail: "Kairo dünyası" }, { href: "/onboarding", label: "Fənn və mövzu seç", detail: "Öyrənməyə başla" }, { href: "/quiz", label: "Sınaq", detail: "Biliyini yoxla" }, { href: "/results", label: "Nəticələr", detail: "Cavablarını anla" }, { href: "/plan", label: "Təhsil planı", detail: "7 günlük yol xəritəsi" }, { href: "/dashboard", label: "İnkişaf", detail: "Şəxsi analitika" }, { href: "/playground", label: "Playground", detail: "Vaxt və diqqət təcrübəsi" }, { href: "/account", label: "Hesab", detail: "Profil və yaddaş" }, { href: "/admin", label: "Admin", detail: "İdarəetmə" }];
const ExperienceContext = createContext({ replay: () => {}, openCommands: () => {}, showRabbit: () => {} });
export const useExperience = () => useContext(ExperienceContext);

function safeRead(key: string, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } }
function safeWrite(key: string, value: string, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, value); } catch {} }

export function ExperienceProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [scene, setScene] = useState<Scene>(path === "/" ? "choice" : "closed");
  const [hidden, setHidden] = useState(false);
  const [sound, setSound] = useState(false);
  const [rabbitState, setRabbitState] = useState<RabbitState>("idle");
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [watch, setWatch] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [bluePosition, setBluePosition] = useState<{ x: number; y: number } | null>(null);
  const escapeIndex = useRef(0);
  const [focusedInput, setFocusedInput] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const stageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quiet = /\/(quiz|mini-quiz|account|admin|onboarding)/.test(path) || focusedInput;
  const overlay = scene !== "closed";

  useEffect(() => {
    if (scene !== "choice") return;
    const warmup = setTimeout(() => { void import("./rabbit-canvas").catch(() => {}); }, 300);
    return () => clearTimeout(warmup);
  }, [scene]);

  useEffect(() => {
    queueMicrotask(() => {
      setHidden(safeRead("kairo.rabbit.hidden") === "1");
      setScene(path === "/" && safeRead("kairo.entered", true) !== "1" ? "choice" : "closed");
    });
    return () => { void audio.current?.close(); };
    // First visit only; replay is explicit and deep links remain direct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => { const enabled = media.matches || safeRead("kairo.motion") === "reduce"; setReduced(enabled); document.documentElement.classList.toggle("motion-reduced", enabled); };
    queueMicrotask(sync); media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!overlay) return;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    intro.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { document.body.style.overflow = old; requestAnimationFrame(() => (returnFocus.current?.isConnected ? returnFocus.current : document.querySelector<HTMLElement>("#main-content"))?.focus()); };
  }, [overlay]);

  useEffect(() => {
    const timing: Partial<Record<Scene, [Scene, number]>> = { arrival: ["invitation", 900], invitation: ["chase", 1700], chase: ["portal", 1500], portal: ["reveal", 900], reveal: ["closed", 600] };
    const step = timing[scene];
    if (!step) return;
    const timer = setTimeout(() => setScene(step[0]), step[1]);
    return () => clearTimeout(timer);
  }, [scene]);

  useEffect(() => {
    queueMicrotask(() => { setMenu(false); setRabbitState("transition"); });
    const timer = setTimeout(() => setRabbitState("idle"), 650);
    return () => clearTimeout(timer);
  }, [path]);

  useEffect(() => {
    let idle: ReturnType<typeof setTimeout>;
    let hop: ReturnType<typeof setTimeout>;
    let lastScroll = 0;
    const active = () => { clearTimeout(idle); idle = setTimeout(() => setRabbitState("resting"), 22000); };
    const scroll = () => {
      active();
      if (Math.abs(window.scrollY - lastScroll) < 320) return;
      lastScroll = window.scrollY; setRabbitState("hop"); clearTimeout(hop); hop = setTimeout(() => setRabbitState("idle"), 750);
    };
    const focus = (e: FocusEvent) => setFocusedInput(e.target instanceof HTMLElement && e.target.matches("input, textarea, select, [contenteditable=true]"));
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (intro.current) return; if (dialog.current?.open) dialog.current.close(); else dialog.current?.showModal(); }
    };
    active(); window.addEventListener("scroll", scroll, { passive: true }); window.addEventListener("pointerdown", active); window.addEventListener("keydown", key); document.addEventListener("focusin", focus);
    return () => { clearTimeout(idle); clearTimeout(hop); window.removeEventListener("scroll", scroll); window.removeEventListener("pointerdown", active); window.removeEventListener("keydown", key); document.removeEventListener("focusin", focus); };
  }, []);

  useEffect(() => {
    if (!menu) return;
    menuRoot.current?.querySelector<HTMLElement>(".rabbit-menu a")?.focus();
    const dismiss = (e: PointerEvent) => { if (!menuRoot.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [menu]);

  function finish() { safeWrite("kairo.entered", "1", true); setScene("closed"); }
  function replay() { setBluePosition(null); returnFocus.current = document.activeElement as HTMLElement; dialog.current?.close(); setMenu(false); setScene("choice"); }
  function escapeBlue() {
    const places = innerWidth < 600 ? [{ x: 65, y: 38 }, { x: 72, y: 75 }, { x: 48, y: 28 }, { x: 72, y: 55 }] : [{ x: 78, y: 27 }, { x: 65, y: 75 }, { x: 83, y: 48 }, { x: 48, y: 22 }];
    setBluePosition(places[escapeIndex.current++ % places.length]);
  }
  function chime() {
    if (!sound) return;
    try {
      const ctx = audio.current ?? (audio.current = new AudioContext()); void ctx.resume();
      const oscillator = ctx.createOscillator(); const gain = ctx.createGain();
      oscillator.type = "sine"; oscillator.frequency.setValueAtTime(380, ctx.currentTime); oscillator.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + .28);
      gain.gain.setValueAtTime(.045, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .35);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime + .36);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    } catch { /* Sound is an optional enhancement. */ }
  }
  function redChoice() { chime(); safeWrite("kairo.entered", "1", true); if (reduced || matchMedia("(prefers-reduced-motion: reduce)").matches) finish(); else setScene("arrival"); }
  function toggleMotion() { const next = !reduced; safeWrite("kairo.motion", next ? "reduce" : "system"); const effective = next || matchMedia("(prefers-reduced-motion: reduce)").matches; setReduced(effective); document.documentElement.classList.toggle("motion-reduced", effective); }
  function hideRabbit() { setHidden(true); setMenu(false); safeWrite("kairo.rabbit.hidden", "1"); }
  function showRabbit() { setHidden(false); safeWrite("kairo.rabbit.hidden", "0"); }
  function curiousWatch() { chime(); setWatch(true); setRabbitState("curiosity"); if (stageTimer.current) clearTimeout(stageTimer.current); stageTimer.current = setTimeout(() => { setWatch(false); setRabbitState("idle"); }, 2200); }
  useEffect(() => () => { if (stageTimer.current) clearTimeout(stageTimer.current); }, []);

  return <ExperienceContext.Provider value={{ replay, openCommands: () => { setQuery(""); dialog.current?.showModal(); }, showRabbit }}>
    <div inert={overlay || undefined} aria-hidden={overlay || undefined}><a className="skip-link" href="#main-content">Əsas məzmuna keç</a><MotionSystem>{children}</MotionSystem></div>
    {!overlay && !hidden && <RabbitTraveller state={rabbitState} reduced={reduced} home={path === "/"} quiet={quiet} />}
    {!overlay && <div ref={menuRoot} className={`rabbit-companion ${quiet ? "companion-quiet" : ""} ${hidden ? "companion-hidden" : ""}`} onKeyDown={e => { if (e.key === "Escape") { setMenu(false); menuRoot.current?.querySelector<HTMLButtonElement>(".rabbit-launcher")?.focus(); } }}>
      {menu && <div className="rabbit-menu" role="region" aria-label="Ağ Dovşan bələdçisi"><div className="rabbit-menu-heading"><span>Hara gedək?</span><button aria-label="Bələdçini bağla" onClick={() => setMenu(false)}><X size={16} /></button></div><Link href="/onboarding">Öyrənməyə başla <ArrowUpRight size={16} /></Link><Link href="/dashboard">İnkişafıma bax <ArrowUpRight size={16} /></Link><Link href="/playground">Playground-a keç <ArrowUpRight size={16} /></Link><button onClick={curiousWatch}><Clock3 size={16} /> Cib saatına bax</button><button onClick={replay}><RotateCcw size={16} /> Girişi yenidən göstər</button><button onClick={toggleMotion} aria-pressed={reduced}>{reduced ? "Hərəkət: azaldılıb" : "Hərəkəti azalt"}</button><button onClick={hideRabbit}><EyeOff size={16} /> Dovşanı gizlət</button></div>}
      {watch && <span className="rabbit-whisper" role="status">Tələsmə. Anlamağa vaxt ayır.</span>}
      <button className="rabbit-launcher" aria-label={hidden ? "Ağ Dovşanı göstər" : "Ağ Dovşan bələdçisini aç"} aria-expanded={!hidden && menu} onClick={() => hidden ? showRabbit() : setMenu(!menu)} onPointerEnter={() => setRabbitState("attention")} onPointerLeave={() => setRabbitState("idle")}>
        {hidden ? <Eye size={18} /> : <><WhiteRabbit state={rabbitState} /><span className="companion-caption">FOLLOW ME <span>↗</span></span></>}
      </button>
    </div>}
    <dialog ref={dialog} className="command-dialog" aria-labelledby="command-title" onClick={e => { if (e.target === e.currentTarget) dialog.current?.close(); }}><div className="command-head"><Command size={20} /><h2 id="command-title">Bir addımda keç</h2><button onClick={() => dialog.current?.close()} aria-label="Axtarışı bağla"><X size={20} /></button></div><label className="sr-only" htmlFor="command-search">Səhifə axtar</label><input id="command-search" autoFocus placeholder="Səhifə və ya alət axtar…" value={query} onChange={e => setQuery(e.target.value)} /><div className="command-results">{destinations.filter(d => `${d.label} ${d.detail}`.toLocaleLowerCase("az").includes(query.toLocaleLowerCase("az"))).map(d => <button key={d.href} onClick={() => { dialog.current?.close(); router.push(d.href); }}><span>{d.label}<small>{d.detail}</small></span><ArrowUpRight size={18} /></button>)}{!query && <button onClick={replay}><span>Seçimə qayıt<small>Giriş səhnəsini yenidən göstər</small></span><RotateCcw size={18} /></button>}</div><p className="command-foot">Tab ilə seç · Enter ilə aç · Esc ilə bağla</p></dialog>
    {overlay && <div ref={intro} className={`choice-scene scene-${scene}`} role="dialog" aria-modal="true" aria-labelledby="choice-title" onKeyDown={e => {
      if (e.key === "Escape") { e.preventDefault(); finish(); }
      if (e.key !== "Tab") return;
      const controls = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button")).filter(b => !b.disabled && b.offsetParent !== null);
      if (!controls.length) return;
      if (e.shiftKey && document.activeElement === controls[0]) { e.preventDefault(); controls.at(-1)?.focus(); }
      else if (!e.shiftKey && document.activeElement === controls.at(-1)) { e.preventDefault(); controls[0]?.focus(); }
    }}>
      <div className="choice-noise" aria-hidden="true" /><header className="choice-top"><span>KAİRO <i>—</i> THE CHOICE</span><div><button onClick={() => setSound(!sound)} aria-label={sound ? "Səsi söndür" : "Səsi aç"} aria-pressed={sound}>{sound ? <Volume2 size={17} /> : <VolumeX size={17} />}<span>{sound ? "Səs açıq" : "Səs bağlı"}</span></button><button onClick={finish}>Girişi keç <ArrowUpRight size={16} /></button></div></header>
      <div className="choice-content"><p className="mono-label">01 / THE CHOICE</p><h1 id="choice-title">Hər şey bir<br /><em>seçimlə</em> başlayır.</h1><p>Bildiyin yolda qal.<br />Ya da sualların arxasınca get.</p></div>
      <div className="choice-portrait"><Image src="/mentor-entrance.webp" alt="İki açıq ovcunda seçim təklif edən orijinal elmi-fantastik mentor" fill priority sizes="(max-width: 700px) 100vw, 850px" /><button className="choice-pill pill-red" disabled={scene !== "choice"} onClick={redChoice} aria-label="Qırmızı pill — Ağ Dovşanın arxasınca get"><span className="pill-object" /><span className="pill-text">QIRMIZI PİLL<small>Kəşf et ↗</small></span></button><div className="choice-pill pill-blue escaping-pill" style={bluePosition ? { left: `${bluePosition.x}%`, top: `${bluePosition.y}%` } : undefined} onPointerEnter={escapeBlue} onPointerDown={escapeBlue} aria-hidden="true"><span className="pill-object" /><span className="pill-text">MAVİ PİLL<small>Tutmaq o qədər də asan deyil.</small></span></div></div>
      <footer className="choice-bottom"><span>BİR SEÇİM. YENİ BİR YOL.</span><span>Öz ritminlə. Öz seçiminlə.</span></footer>
      {scene !== "choice" && <div className="rabbit-hole"><div className="portal-vignette" aria-hidden="true" /><div className="portal-stars" aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ "--star": i, "--angle": `${i * 137.5}deg`, "--distance": `${130 + i % 7 * 45}px` } as CSSProperties} />)}</div><div className="portal-depth" aria-hidden="true">{Array.from({length: 12}, (_, i) => <i key={i} style={{ "--ring": i } as CSSProperties} />)}</div><div className="tunnel-rings" aria-hidden="true"><i /><i /><i /><i /><i /></div><div className="chase-rabbit"><RabbitCanvas state={scene === "chase" || scene === "portal" ? "running" : "attention"} reduced={reduced} /></div><div className="invitation-copy"><p className="mono-label">THE WAY IN</p><h2>Follow the<br /><em>white rabbit.</em></h2><p>Maraq səni bir addım irəli aparır.</p></div><div className="journey-chapters" aria-hidden="true"><span>THE WHITE RABBIT</span><div>{["arrival","invitation","chase","portal","reveal"].map((step,i) => <i key={step} className={["arrival","invitation","chase","portal","reveal"].indexOf(scene) >= i ? "complete" : ""} />)}</div><span>{scene === "arrival" || scene === "invitation" ? "Onun arxasınca get" : scene === "chase" ? "Yeni yol açılır" : "Maraq dünyasına xoş gəldin"}</span></div><p className="sr-only" role="status">Ağ Dovşan səni sayta aparır. Girişi keç düyməsi ilə davam edə bilərsən.</p></div>}
    </div>}
  </ExperienceContext.Provider>;
}
