"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

const escapes = [{ x: 83, y: 43 }, { x: 63, y: 31 }, { x: 86, y: 65 }, { x: 71, y: 49 }, { x: 88, y: 32 }];
export function MatrixEntrance({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [blue, setBlue] = useState({ x: 75, y: 65 });
  const count = useRef(0);
  const red = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const seen = sessionStorage.getItem("kairo.entered") === "1";
    queueMicrotask(() => { setEntered(seen); setLoaded(true); });
  }, []);
  useEffect(() => {
    if (entered || !loaded) return;
    red.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [entered, loaded]);
  const enter = () => { sessionStorage.setItem("kairo.entered", "1"); setEntered(true); };
  if (loaded && entered) return <>{children}</>;
  return <><div inert aria-hidden="true">{children}</div><div className="matrix-entrance" role="dialog" aria-modal="true" aria-labelledby="entrance-title" onKeyDown={event => {
    if (event.key !== "Tab") return;
    const buttons = event.currentTarget.querySelectorAll("button");
    if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); (buttons[buttons.length - 1] as HTMLButtonElement).focus(); }
    else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); (buttons[0] as HTMLButtonElement).focus(); }
  }}>
    <div className="matrix-grain" aria-hidden="true" />
    <header className="entrance-copy"><p className="eyebrow">KAİRO / SEÇİM SƏNİNDİR</p><h1 id="entrance-title">Öyrənməyə <em>oyan.</em></h1><p>Hazır cavabların arxasında bir dünya var.<br />Qırmızı pilli seç. Öz yolunu başlat.</p></header>
    <div className="mentor-stage">
      <Image src="/mentor-entrance.webp" alt="Qaranlıq rəqəmsal otaqda açıq ovucları ilə seçim təklif edən orijinal mentor obrazı" fill priority sizes="(max-width: 900px) 100vw, 1050px" className="mentor-image" />
      <button ref={red} type="button" onClick={enter} className="floating-pill red-pill" aria-label="Qırmızı pilli seç və ana səhifəyə daxil ol"><span /><span className="pill-label">DAXİL OL ↗</span></button>
      <div className="floating-pill blue-pill" style={{ left: `${blue.x}%`, top: `${blue.y}%` }} onPointerEnter={() => setBlue(escapes[count.current++ % escapes.length])} onPointerDown={() => setBlue(escapes[count.current++ % escapes.length])} aria-hidden="true"><span /></div>
    </div>
    <footer className="entrance-footer"><span>FOLLOW THE RABBIT</span><button type="button" onClick={enter}>Animasiya olmadan daxil ol →</button></footer>
  </div></>;
}
