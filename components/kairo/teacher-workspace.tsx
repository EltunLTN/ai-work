"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { kairo, useKairo, dateTime } from "@/lib/kairo/client";
import type { TutorSession, TutorState } from "@/lib/kairo/types";
import { ModuleHeading, ModuleStatus, Notice } from "./shared";
import { MathContent } from "./math-content";
const subjects = ["Riyaziyyat", "Fizika", "Kimya", "Biologiya", "Coğrafiya"];
export function TeacherWorkspace({ compact = false }: { compact?: boolean }) {
  const list = useKairo<{ sessions: TutorSession[] }>("tutor.list"),
    [lesson, setLesson] = useState<TutorState | null>(null),
    [subject, setSubject] = useState(subjects[0]),
    [grade, setGrade] = useState(11),
    [topic, setTopic] = useState(""),
    [statement, setStatement] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [share, setShare] = useState(false);
  const [retry, setRetry] = useState<{
    id: string;
    request_id: string;
    message: string;
    action: string;
  } | null>(null);
  const controller = useRef<AbortController | null>(null),
    bottom = useRef<HTMLDivElement>(null),
    loaded = useRef(false);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    queueMicrotask(() => {
      setSubject(
        subjects.includes(p.get("subject") ?? "")
          ? p.get("subject")!
          : subjects[0],
      );
      setTopic((p.get("topic") ?? "").slice(0, 200));
      setGrade(Math.max(1, Math.min(11, Number(p.get("grade")) || 11)));
    });
    return () => controller.current?.abort();
  }, []);
  useEffect(() => {
    if (loaded.current || list.status !== "ready") return;
    loaded.current = true;
    const id = new URLSearchParams(window.location.search).get("session");
    if (id)
      void kairo<TutorState>("tutor.get", { id })
        .then(setLesson)
        .catch((e) => setError(e.message));
  }, [list.status]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lesson?.messages.length, busy]);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams(window.location.search);
      const next = await kairo<TutorState>("tutor.create", {
        subject,
        grade,
        topic,
        statement,
        mode: "socratic",
        ...(p.get("question") ? { question_id: p.get("question") } : {}),
      });
      setLesson(next);
      list.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(id: string) {
    if (busy) return;
    try {
      setLesson(await kairo<TutorState>("tutor.get", { id }));
      setError("");
      setRetry(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function send(action = "message", again = false) {
    if (!lesson || busy) return;
    const text =
      message.trim() ||
      (
        {
          hint1: "Birinci ipucunu ver.",
          hint2: "İkinci ipucunu ver.",
          hint3: "Növbəti addıma yönəlt.",
          solution: "Tam həlli açmaq istəyirəm.",
          practice: "Bu anlayış üzrə yeni məşq ver.",
        } as Record<string, string>
      )[action];
    if (!text && !again) return;
    const turn = again
      ? retry
      : {
          id: lesson.session.id,
          request_id: crypto.randomUUID(),
          message: text,
          action,
        };
    if (!turn) return;
    setRetry(turn);
    controller.current = new AbortController();
    setBusy(true);
    setError("");
    try {
      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      if (!session) throw new Error("Hesaba yenidən daxil ol.");
      const response = await fetch("/api/ai/teacher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(turn),
        signal: controller.current.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Cavab alınmadı.");
      setLesson(result);
      setMessage("");
      setRetry(null);
      list.refresh();
    } catch (e) {
      setError(
        e instanceof Error && e.name === "AbortError"
          ? "Cavab dayandırıldı. Sessiya saxlanılıb."
          : (e as Error).message,
      );
      void kairo<TutorState>("tutor.get", { id: lesson.session.id })
        .then(setLesson)
        .catch(() => {});
    } finally {
      setBusy(false);
      controller.current = null;
    }
  }
  async function mode(value: string) {
    if (!lesson) return;
    try {
      setLesson(
        await kairo("tutor.mode", { id: lesson.session.id, mode: value }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div
      className={compact ? "teacher-workspace is-compact" : "teacher-workspace"}
    >
      {!compact && (
        <ModuleHeading
          eyebrow="02 / AI müəllim"
          title="Cavabı tap. Məntiqi anla."
          description="Bir sual, bir addım, öz həllin. Köməkli öyrənmə ayrıca qeyd olunur və müstəqil imtahan nəticəsi sayılmır."
        />
      )}
      <ModuleStatus {...list} retry={list.refresh} />
      {error && (
        <Notice error>
          {error}{" "}
          {retry && !busy && (
            <button onClick={() => void send("message", true)}>
              Yenidən cəhd et
            </button>
          )}
        </Notice>
      )}
      {list.data && (
        <div className="teacher-layout">
          <aside className="teacher-sidebar">
            <button
              className="module-button primary"
              disabled={busy}
              onClick={() => {
                setLesson(null);
                setRetry(null);
              }}
            >
              Yeni dərs +
            </button>
            <h2>Son dərslər</h2>
            {!list.data.sessions.length && <p>İlk sualını yazaraq başla.</p>}
            {list.data.sessions.map((s) => (
              <button
                key={s.id}
                className="teacher-session"
                aria-current={lesson?.session.id === s.id ? "page" : undefined}
                disabled={busy}
                onClick={() => void open(s.id)}
              >
                <strong>{s.topic}</strong>
                <span>
                  {s.subject} · {s.grade}-ci sinif
                </span>
                <small>{dateTime(s.updated_at)}</small>
              </button>
            ))}
          </aside>
          <section className="teacher-main">
            {!lesson ? (
              <form className="module-panel module-form" onSubmit={create}>
                <h2>Bu gün nəyi aydınlaşdıraq?</h2>
                <div className="module-form-row">
                  <label>
                    Fənn
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    >
                      {subjects.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Sinif
                    <select
                      value={grade}
                      onChange={(e) => setGrade(Number(e.target.value))}
                    >
                      {Array.from({ length: 11 }, (_, i) => (
                        <option key={i} value={i + 1}>
                          {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Mövzu
                  <input
                    required
                    maxLength={200}
                    placeholder="Məsələn, xətti tənliklər"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </label>
                <label>
                  Sual və ya çətinlik
                  <textarea
                    rows={5}
                    maxLength={4000}
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                    placeholder="Sualı olduğu kimi yaz. Məsələn: 2x + 3 = 11"
                  />
                </label>
                <button
                  className="module-button primary"
                  disabled={busy || !topic.trim()}
                >
                  {busy ? "Açılır…" : "Dərsə başla"}
                </button>
              </form>
            ) : (
              <>
                <div className="teacher-toolbar">
                  <div>
                    <h2>{lesson.session.topic}</h2>
                    <span>
                      {lesson.session.subject} · {lesson.session.grade}-ci sinif
                    </span>
                  </div>
                  <label className="sr-only" htmlFor="teacher-mode">
                    Tədris rejimi
                  </label>
                  <select
                    id="teacher-mode"
                    disabled={busy}
                    value={lesson.session.mode}
                    onChange={(e) => void mode(e.target.value)}
                  >
                    <option value="socratic">Sokratik dialoq</option>
                    <option value="explain">İzah et</option>
                    <option value="practice">Məşq et</option>
                  </select>
                </div>
                {lesson.session.question_context.statement && (
                  <div className="teacher-context">
                    <MathContent>
                      {lesson.session.question_context.statement}
                    </MathContent>
                  </div>
                )}
                <div className="teacher-messages" aria-live="polite">
                  {!lesson.messages.length && (
                    <p className="teacher-welcome">
                      Əvvəlcə öz yanaşmanı yaz. Haradan başlayacağını
                      bilmirsənsə, birinci ipucunu seç.
                    </p>
                  )}
                  {lesson.messages.map((m) => (
                    <article
                      key={m.id}
                      className={`teacher-message is-${m.role}`}
                    >
                      <span className="message-role">
                        {m.role === "assistant" ? "Kairo müəllim" : "Sən"}
                        {m.status !== "complete"
                          ? ` · ${m.status === "pending" ? "Hazırlanır" : m.status === "stopped" ? "Dayandırılıb" : "Təkrar cəhd tələb olunur"}`
                          : ""}
                      </span>
                      <MathContent>{m.content}</MathContent>
                      {m.role === "assistant" && (
                        <button
                          className="message-report"
                          onClick={() => {
                            setReport(m.id);
                            setReason("");
                            setShare(false);
                          }}
                        >
                          Cavabı bildir
                        </button>
                      )}
                    </article>
                  ))}
                  {busy && (
                    <p role="status">Müəllim növbəti addımı hazırlayır…</p>
                  )}
                  <div ref={bottom} />
                </div>
                <div className="teacher-hints">
                  {[1, 2, 3].map((n) => (
                    <button
                      className="module-button"
                      disabled={
                        busy ||
                        n > lesson.session.hint_level + 1 ||
                        n > (lesson.limits?.max_hints ?? 3)
                      }
                      key={n}
                      onClick={() => void send(`hint${n}`)}
                    >
                      İpucu {n}
                    </button>
                  ))}
                  <button
                    className="module-button"
                    disabled={busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          "Tam həll açılacaq və bu dərs köməkli öyrənmə kimi qeyd ediləcək. Davam edilsin?",
                        )
                      )
                        void send("solution");
                    }}
                  >
                    Həlli aç
                  </button>
                  <button
                    className="module-button"
                    disabled={busy}
                    onClick={() => void send("practice")}
                  >
                    Oxşar məşq
                  </button>
                </div>
                <form
                  className="teacher-composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <label
                    className="sr-only"
                    htmlFor={`teacher-message-${compact ? "popup" : "page"}`}
                  >
                    Cəhdin və ya sualın
                  </label>
                  <textarea
                    id={`teacher-message-${compact ? "popup" : "page"}`}
                    rows={3}
                    maxLength={6000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Cəhdini və ya növbəti sualını yaz…"
                  />
                  <div className="module-actions">
                    {busy ? (
                      <button
                        type="button"
                        className="module-button"
                        onClick={() => controller.current?.abort()}
                      >
                        Dayandır
                      </button>
                    ) : (
                      <>
                        <button
                          className="module-button primary"
                          disabled={!message.trim()}
                        >
                          Göndər
                        </button>
                        <button
                          type="button"
                          className="module-button"
                          disabled={!message.trim()}
                          onClick={() => void send("check")}
                        >
                          Cavabımı yoxla
                        </button>
                      </>
                    )}
                    <Link
                      className="module-button"
                      href={`/kairo/focus?subject=${encodeURIComponent(lesson.session.subject)}&task=${encodeURIComponent(lesson.session.topic)}&return_path=/kairo/tutor`}
                    >
                      Fokus
                    </Link>
                  </div>
                </form>
                <div className="teacher-progress">
                  <span>
                    {lesson.session.hint_count ?? lesson.session.hint_level}{" "}
                    ipucu · {lesson.session.attempts} cəhd ·{" "}
                    {lesson.session.solved_verified
                      ? "Riyazi cavab təsdiqlənib"
                      : "Müstəqil nəticə deyil"}
                  </span>
                  <button
                    className="module-button"
                    disabled={busy || lesson.session.status === "completed"}
                    onClick={() =>
                      void kairo<TutorState>("tutor.complete", {
                        id: lesson.session.id,
                      })
                        .then(setLesson)
                        .catch((e) => setError(e.message))
                    }
                  >
                    {lesson.session.status === "completed"
                      ? "Dərs tamamlanıb"
                      : "Dərsi tamamla"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
      {report && (
        <div className="module-modal-backdrop">
          <form
            className="module-modal module-form"
            onSubmit={(e) => {
              e.preventDefault();
              void kairo("tutor.report", {
                message_id: report,
                reason,
                consent: share,
              })
                .then(() => setReport(null))
                .catch((e) => setError(e.message));
            }}
          >
            <h2>Cavabı adminə bildir</h2>
            <label>
              Səbəb
              <textarea
                required
                minLength={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <label className="module-checkbox">
              <input
                type="checkbox"
                checked={share}
                onChange={(e) => setShare(e.target.checked)}
              />
              Seçilmiş AI cavabını və səbəbi adminlə paylaşmağa razıyam.
            </label>
            <div className="module-actions">
              <button
                className="module-button"
                type="button"
                onClick={() => setReport(null)}
              >
                Bağla
              </button>
              <button className="module-button primary" disabled={!share}>
                Bildir
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
