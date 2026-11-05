"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KairoAccountBoundary } from "@/components/kairo/shared";
import { usePathname } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { SocratesPortrait } from "./socrates-portrait";
const Teacher = dynamic(
  () =>
    import("@/components/kairo/teacher-workspace").then(
      (m) => m.TeacherWorkspace,
    ),
  { ssr: false, loading: () => <p role="status">AI müəllim açılır…</p> },
);
export function AITutor() {
  const [open, setOpen] = useState(false),
    launcher = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLElement>(null),
    path = usePathname();
  function close() {
    setOpen(false);
    launcher.current?.focus();
  }
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  if (path.startsWith("/kairo/tutor")) return null;
  return (
    <div className="ai-tutor-launcher">
      <button
        ref={launcher}
        className="teacher-launcher socrates-launcher"
        aria-label={open ? "AI müəllimi bağla" : "AI müəllimi aç"}
        aria-expanded={open}
        aria-controls="kairo-teacher-popup"
        onClick={() => (open ? close() : setOpen(true))}
      >
        <SocratesPortrait/><span className="socrates-chat-badge"><MessageCircle size={15}/></span><span className="socrates-launcher-name">Sokrat</span>
      </button>
      {open && (
        <section
          ref={panel}
          tabIndex={-1}
          id="kairo-teacher-popup"
          className="teacher-popup"
          role="dialog"
          aria-label="Kairo AI müəllim"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
        >
          <header className="teacher-popup-header">
            <span>Sokrat <small> / Kairo AI müəllim</small></span>
            <div>
              <Link href="/kairo/tutor" onClick={close}>
                Tam ekran ↗
              </Link>
              <button onClick={close} aria-label="AI müəllimi bağla">
                <X size={20} />
              </button>
            </div>
          </header>
          <div className="teacher-popup-body">
            <KairoAccountBoundary>
              <Teacher compact />
            </KairoAccountBoundary>
          </div>
        </section>
      )}
    </div>
  );
}
