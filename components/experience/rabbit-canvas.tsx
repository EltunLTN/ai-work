"use client";
import { useEffect, useRef, useState } from "react";
import { mountRabbitScene } from "./rabbit-scene";
import { WhiteRabbit, type RabbitState } from "./white-rabbit";

export default function RabbitCanvas({ state = "idle", reduced = false }: { state?: RabbitState; reduced?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const current = useRef({ state, reduced });
  const [ready, setReady] = useState(false);
  useEffect(() => { current.current = { state, reduced }; }, [state, reduced]);
  useEffect(() => {
    if (!canvas.current) return;
    try {
      const dispose = mountRabbitScene(canvas.current, () => current.current.state, () => current.current.reduced);
      queueMicrotask(() => setReady(true));
      return dispose;
    } catch { /* WebGL unavailable: the original accessible SVG stays visible. */ }
  }, []);
  return <div className={`rabbit-3d ${ready ? "webgl-ready" : ""}`} data-renderer={ready ? "webgl" : "svg"} aria-hidden="true"><WhiteRabbit state={state} /><canvas ref={canvas} /></div>;
}
