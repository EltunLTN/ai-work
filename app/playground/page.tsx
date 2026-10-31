"use client";
import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { WorkspaceHeading } from "@/components/layout/workspace-heading";
import { WhiteRabbit } from "@/components/experience/white-rabbit";

export default function Playground() {
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const [clock, setClock] = useState(false);
  useEffect(() => {
    if (phase !== "running") return;
    // No timer while idle, and abort an interrupted attempt instead of counting background time.
    const interrupt = () => { if (document.hidden) setPhase("ready"); };
    document.addEventListener("visibilitychange", interrupt);
    const limit = setTimeout(() => { setElapsed((performance.now() - started.current) / 1000); setPhase("done"); }, 30000);
    return () => { clearTimeout(limit); document.removeEventListener("visibilitychange", interrupt); };
  }, [phase]);
  function toggle() {
    if (phase === "running") { setElapsed((performance.now() - started.current) / 1000); setPhase("done"); }
    else { started.current = performance.now(); setPhase("running"); }
  }
  return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="mx-auto max-w-6xl px-5"><WorkspaceHeading index="PLAYGROUND" title="Marağın üçün yer var." description="Dərsdən qısa bir dolanbac. Diqqətini topla. Vaxtın necə keçdiyini hiss et." /><section className="playground-games"><article className="time-experiment"><span className="mono-label">01 / VAXT HİSSİ</span><div className="time-rabbit"><WhiteRabbit state={clock ? "curiosity" : phase === "running" ? "attention" : "idle"} /><button className="pocket-secret" onClick={() => setClock(!clock)} aria-label="Cib saatının sirrini aç" aria-pressed={clock}>↗</button></div><h2>On saniyə nə qədərdir?</h2><p>Başlat. Ekranda sayğac yoxdur. On saniyə keçdiyini hiss etdikdə dayandır. Nəticə yalnız bu səhifədə qalır.</p><button onClick={toggle} className="editorial-button">{phase === "running" ? "Dayandır" : phase === "done" ? "Yenidən sına" : "Vaxtı başlat"}{phase === "done" && <RotateCcw size={16} />}</button><div className="time-result" role="status">{phase === "running" ? "Öz ritmini dinlə…" : phase === "done" ? `${elapsed.toFixed(2)} saniyə · fərq ${Math.abs(elapsed - 10).toFixed(2)} saniyə` : clock ? "Saat tələsmir. Sən də tələsmə." : "Hazır olanda başla."}</div><p className="experiment-note">Diaqnostik test deyil, sadə vaxt təcrübəsidir. 30 saniyədə avtomatik dayanır.</p></article></section></main><Footer /></div>;
}
