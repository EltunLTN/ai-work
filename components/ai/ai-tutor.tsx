"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, MessageCircle, Send, Sparkles, Trash2, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { getQuizResult, getStudentProfile, getStudyPlan } from "@/lib/storage";
import type { ChatMessage, LearningResource } from "@/lib/types";
import { LearningResourceCards } from "@/components/ai/learning-resource-cards";

type DisplayMessage = ChatMessage & { resources?: LearningResource[] };
const HISTORY_KEY = "kairo.tutor.chat";

export function AITutor() {
  const { locale } = useLocale();
  const en = locale === "en";
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (open) {
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      if (!loading) inputRef.current?.focus();
    }
  }, [messages, loading, open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  function toggleOpen() {
    if (open) { close(); return; }
    if (!messages.length) {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(HISTORY_KEY) ?? "[]");
        if (Array.isArray(saved) && saved.every((item) => item &&
          (item.role === "user" || item.role === "assistant") && typeof item.content === "string")) {
          setMessages(saved.slice(-20).map((item) => ({ role: item.role, content: item.content })));
        }
      } catch { /* A corrupt or blocked session store does not prevent chatting. */ }
    }
    setOpen(true);
  }

  async function send(text: string, retry = false) {
    if (sending.current || (!retry && !text.trim())) return;
    sending.current = true;
    const next: DisplayMessage[] = retry ? messages : [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setDraft("");
    setError(null);
    setLoading(true);
    const profile = getStudentProfile();
    const result = getQuizResult();
    const plan = getStudyPlan();
    const history = next.slice(-20).map(({ role, content }) => ({ role, content: content.slice(0, 6000) }));
    while (history.length > 1 && history.reduce((sum, item) => sum + item.content.length, 0) > 40000) history.shift();
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history, locale,
          context: {
            grade: profile?.grade,
            topics: profile?.selectedTopics ?? [],
            result: result && profile?.grade === result.grade ? {
              totalQuestions: result.totalQuestions, totalCorrect: result.totalCorrect,
              topicScores: result.topicScores, submittedAt: result.submittedAt,
            } : undefined,
            plan: plan?.resultSubmittedAt === result?.submittedAt ? { title: plan?.title, days: plan?.days } : undefined,
          },
        }),
      });
      const data = await response.json() as { answer?: string; resources?: LearningResource[]; error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error ?? (en ? "AI could not reply." : "AI cavabı alınmadı."));
      const updated: DisplayMessage[] = [...next, { role: "assistant", content: data.answer, resources: data.resources }];
      setMessages(updated);
      try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(updated.slice(-20).map(({ role, content }) => ({ role, content })))); } catch { /* Optional persistence. */ }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI cavabı alınmadı.");
    } finally {
      setLoading(false);
      sending.current = false;
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 md:right-6 md:bottom-6">
      {open ? (
        <section id="kairo-ai-tutor" role="dialog" aria-labelledby="tutor-title"
          onKeyDown={(event) => { if (event.key === "Escape") close(); }}
          className="mb-3 flex h-[min(640px,calc(100dvh-110px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-red-400/30 bg-[var(--page-bg)] text-[var(--page-text)] shadow-2xl">
          <header className="flex items-center gap-3 border-b border-[var(--card-border)] bg-red-500/10 p-4">
            <span className="rounded-2xl bg-red-500/15 p-2.5"><Sparkles className="h-5 w-5 text-red-400" /></span>
            <div className="flex-1">
              <h2 id="tutor-title" className="font-bold">Kairo AI</h2>
              <p className="kairo-muted text-xs">{en ? "Your mathematics tutor" : "Sənin riyaziyyat köməkçin"}</p>
            </div>
            <button type="button" disabled={loading} aria-label={en ? "Clear conversation" : "Söhbəti təmizlə"}
              onClick={() => { setMessages([]); setError(null); try { sessionStorage.removeItem(HISTORY_KEY); } catch {} }}
              className="kairo-muted rounded-lg p-2 hover:bg-red-500/10 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
            <button type="button" onClick={close} aria-label={en ? "Close chat" : "Söhbəti bağla"} className="rounded-lg p-2 hover:bg-red-500/10"><X className="h-4 w-4" /></button>
          </header>
          <div className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-4" role="log" aria-live="polite" aria-busy={loading}>
            {!messages.length ? (
              <div className="py-5">
                <p className="text-lg font-semibold">{en ? "What shall we learn today?" : "Bu gün nəyi öyrənək?"}</p>
                <p className="kairo-muted mt-2 text-sm">{en ? "Ask a math question, discuss your mistakes, or work through your plan." : "Riyaziyyatdan sual ver, səhvlərini müzakirə et və ya planındakı mövzunu birlikdə öyrənək."}</p>
                <div className="mt-5 space-y-2">
                  {(en ? ["Explain my weak topics", "How should I follow my plan?", "Explain a math topic step by step"] : ["Zəif mövzularımı izah et", "Planımla necə işləyim?", "Seçdiyim mövzudan nümunə həll et"]).map((text) => (
                    <button key={text} type="button" onClick={() => send(text)} className="kairo-card w-full rounded-xl p-3 text-left text-sm hover:border-red-400/40">{text}</button>
                  ))}
                </div>
              </div>
            ) : messages.map((message, index) => (
              <article key={index} className={`rounded-2xl p-3 text-sm ${message.role === "user" ? "ml-7 bg-red-500/15" : "kairo-card mr-2"}`}>
                <p className="mb-1 text-[10px] font-bold tracking-wider text-red-400">{message.role === "assistant" ? "KAIRO AI" : en ? "YOU" : "SƏN"}</p>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                {message.resources?.length ? <LearningResourceCards compact resources={message.resources} /> : null}
              </article>
            ))}
            {loading ? <p className="kairo-muted flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />{en ? "Thinking…" : "Cavab hazırlanır…"}</p> : null}
            {error ? <div role="alert" className="rounded-xl border border-red-400/30 p-3 text-sm text-red-400">
              <p>{error}</p><button type="button" onClick={() => send("", true)} disabled={loading} className="mt-2 font-semibold underline">{en ? "Retry" : "Yenidən cəhd et"}</button>
            </div> : null}
            <div ref={bottom} />
          </div>
          <form onSubmit={(event) => { event.preventDefault(); send(draft); }} className="border-t border-[var(--card-border)] p-3">
            <div className="flex items-end gap-2">
              <textarea ref={inputRef} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={3000} rows={2}
                aria-label={en ? "Your question" : "Sualın"} placeholder={en ? "Type your question…" : "Sualını yaz…"}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); send(draft); } }}
                className="kairo-input max-h-32 min-h-16 flex-1 resize-y rounded-2xl p-3 text-sm outline-none focus:ring-2 focus:ring-red-400/50" />
              <button type="submit" disabled={loading || !draft.trim()} aria-label={en ? "Send" : "Göndər"} className="rounded-2xl bg-red-500 p-3 text-white disabled:opacity-40"><Send className="h-5 w-5" /></button>
            </div>
            <p className="kairo-muted mt-2 text-[10px]">{en ? "AI uses your grade, latest result and plan. Verify important calculations." : "AI sinfini, son nəticəni və planını nəzərə alır. Vacib hesablamaları yoxla."}</p>
          </form>
        </section>
      ) : null}
      <button ref={launcher} type="button" onClick={toggleOpen} aria-expanded={open} aria-controls="kairo-ai-tutor"
        aria-label={en ? "Open Kairo AI tutor" : "Kairo AI köməkçisini aç"}
        className="ml-auto flex items-center gap-2 rounded-full bg-red-500 px-5 py-4 text-sm font-bold text-white shadow-lg shadow-red-500/25 transition hover:bg-red-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-400">
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />} Kairo AI
      </button>
    </div>
  );
}
