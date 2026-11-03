"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBrowserReady } from "@/hooks/use-browser-ready";
import Loading from "@/app/loading";
import { aiFetch } from "@/lib/supabase/client";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { WorkspaceHeading } from "@/components/layout/workspace-heading";
import { QuizCard } from "@/components/quiz/quiz-card";
import { QuizProgress } from "@/components/quiz/quiz-progress";
import { Button } from "@/components/ui/button";
import { scoreExam } from "@/lib/exam-results";
import { analyzeResults } from "@/lib/ai-learning";
import { appendQuestionHistory, consumePendingQuiz, getQuestionHistory, getStudentProfile, saveAnalysis, saveQuizAnswers, saveQuizQuestions, saveQuizResult } from "@/lib/storage";
import { getExamSetup, getExamDraft, saveExamSetup, saveExamDraft, clearExamSession, type ExamSetup } from "@/lib/exam-session";
import { saveToCloud } from "@/lib/cloud-storage";
import { trackActivity } from "@/lib/activity-client";
import type { Question, QuizAnswers, QuizResult, Subject } from "@/lib/types";

export default function QuizPage() { return useBrowserReady() ? <QuizContent /> : <Loading />; }
function QuizContent() {
  const router = useRouter();
  const [configured] = useState(() => getExamSetup());
  const [setup] = useState<ExamSetup | null>(() => { const p = getStudentProfile(); return configured ?? (p ? { id: crypto.randomUUID(), grade: p.grade, count: 8, profiles: [p] } : null); });
  const [questions, setQuestions] = useState<Question[]>([]), [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0), [status, setStatus] = useState("loading"), [error, setError] = useState("");
  const started = useRef(false), elapsed = useRef<Record<string, number>>({}), tick = useRef(0), activeSubject = useRef<Subject | null>(null), visible = useRef(true);
  const cached = useRef(new Map<Subject, Question[]>()), finished = useRef<QuizResult[] | null>(null);
  const current = questions[index];
  function accrue() { const now = Date.now(); if (tick.current && activeSubject.current && visible.current) elapsed.current[activeSubject.current] = (elapsed.current[activeSubject.current] ?? 0) + Math.max(0, now - tick.current); tick.current = now; }
  async function load() {
    if (!setup) { router.replace("/onboarding"); return; }
    setStatus("loading"); setError("");
    try {
      const draft = configured ? getExamDraft(setup) : null;
      if (draft) { elapsed.current = draft.elapsed; setQuestions(draft.questions); setAnswers(draft.answers); setIndex(draft.index); setStatus("ready"); return; }
      const pending = !configured ? consumePendingQuiz() : null;
      if (pending?.length && pending.every(q => q.grade === setup.grade && q.subject === setup.profiles[0].subject)) { saveExamSetup({ ...setup, count: pending.length }); setQuestions(pending); saveQuizQuestions(pending); setStatus("ready"); return; }
      if (!configured) saveExamSetup(setup);
      const batches = await Promise.allSettled(setup.profiles.map(async (p, i) => {
        const existing = cached.current.get(p.subject); if (existing) return existing;
        const response = await aiFetch("/api/ai/diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grade: setup.grade, subject: p.subject, topics: p.selectedTopics, count: setup.count, excludedQuestionStems: getQuestionHistory() }) });
        const data = await response.json() as { questions?: Question[]; error?: string };
        if (!response.ok || data.questions?.length !== setup.count || !data.questions.every(q => q.grade === setup.grade && q.subject === p.subject && p.selectedTopics.includes(q.topic))) throw new Error(`${p.subject}: ${data.error ?? "Seçilən sayda uyğun sual alınmadı."}`);
        const batch = data.questions.map((q, n) => ({ ...q, id: `${setup.id}-${i}-${n}` })); cached.current.set(p.subject, batch); return batch;
      }));
      const failed = batches.find(b => b.status === "rejected"); if (failed?.status === "rejected") throw failed.reason;
      const all = batches.flatMap(b => b.status === "fulfilled" ? b.value : []);
      setQuestions(all); saveQuizQuestions(all); appendQuestionHistory(all.map(q => q.question)); setStatus("ready");
      trackActivity("exam.started", { grade: setup.grade, subjects: setup.profiles.map(p => p.subject).join(","), count: all.length });
    } catch (e) { setError(e instanceof Error ? e.message : "Suallar hazırlanmadı."); setStatus("error"); }
  }
  useEffect(() => { if (!started.current) { started.current = true; void load(); } /* initial setup is fixed for this attempt */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { accrue(); activeSubject.current = current?.subject ?? null; visible.current = !document.hidden; tick.current = Date.now(); }, [current?.subject]);
  useEffect(() => {
    if (!setup || !questions.length) return;
    const persist = () => { accrue(); try { saveExamDraft({ setupId: setup.id, questions, answers, index, elapsed: elapsed.current }); } catch { setError("Brauzer yaddaşı doludur. Bu tabı bağlamadan sınağı tamamla."); } };
    persist(); const timer = setInterval(persist, 10000);
    const visibility = () => { persist(); visible.current = !document.hidden; };
    document.addEventListener("visibilitychange", visibility); window.addEventListener("pagehide", persist);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visibility); window.removeEventListener("pagehide", persist); };
  }, [setup, questions, answers, index]);
  const answered = useMemo(() => questions.filter(q => answers[q.id] !== undefined).length, [questions, answers]);
  async function submit() {
    if (!setup || answered !== questions.length || status === "saving") return;
    accrue(); activeSubject.current = null; setStatus("saving"); setError("");
    const base = Date.now();
    const results = finished.current ?? scoreExam(setup, questions, answers, elapsed.current, base);
    finished.current = results;
    try {
      for (const result of results) saveQuizResult(result);
      const primary = results[0], primaryQuestions = questions.filter(q => q.subject === primary.subject);
      saveQuizQuestions(primaryQuestions); saveQuizAnswers(answers); saveQuizResult(primary); saveAnalysis(analyzeResults(answers, primaryQuestions));
      await saveToCloud();
      clearExamSession(); trackActivity("exam.completed", { count: questions.length, subjects: setup.profiles.map(p => p.subject).join(","), grade: setup.grade });
      router.push(setup.profiles.length > 1 ? "/dashboard?completed=1" : "/results");
    } catch { setStatus("ready"); setError("Nəticələr cihazda qorundu, bazaya göndərilmədi. Bağlantını yoxla və yenidən Tamamla düyməsinə bas; eyni nəticə təkrar yazılmayacaq."); }
  }
  if (!setup || status === "loading") return <div className="kairo-page"><Navbar /><main id="main-content" className="mx-auto max-w-4xl px-4 py-16"><p role="status">{setup ? `${setup.profiles.map(p => p.subject).join(" · ")} üçün suallar hazırlanır…` : "Seçimə yönləndirilir…"}</p><p className="kairo-muted mt-4">Hər fənn üçün mövzu, sinif və sual sayı ayrıca yoxlanır.</p></main></div>;
  if (status === "error" || !current) return <div className="kairo-page"><Navbar /><main id="main-content" className="mx-auto max-w-4xl space-y-4 px-4 py-16"><h1 className="text-3xl">Suallar hazırlanmadı</h1><p role="alert">{error}</p><Button onClick={() => void load()}>Yenidən cəhd et</Button><Button variant="secondary" onClick={() => router.push("/onboarding")}>Seçimi dəyiş</Button><Button variant="secondary" onClick={() => router.push("/account")}>Hesaba daxil ol</Button></main></div>;
  return <div className="kairo-page"><Navbar /><main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 md:px-6">
    <WorkspaceHeading index="02 / SINAQ" title={setup.profiles.length > 1 ? "Biliyinə fərqli tərəflərdən bax." : `${current.subject} sınağı`} description={`${setup.grade}-ci sinif · ${setup.profiles.length} fənn · ${questions.length} sual`} />
    <div className="exam-running-subjects" role="group" aria-label="Fənn bölməsinə keç">{setup.profiles.map(p => { const batch = questions.filter(q => q.subject === p.subject); return <button key={p.subject} aria-pressed={current.subject === p.subject} onClick={() => setIndex(questions.findIndex(q => q.subject === p.subject))}>{p.subject}<span>{batch.filter(q => answers[q.id] !== undefined).length}/{batch.length}</span></button>; })}</div>
    <QuizProgress answered={answered} total={questions.length} /><p className="eyebrow">{current.subject} · {current.topic}</p>
    <QuizCard question={current} questionNumber={index + 1} total={questions.length} selectedIndex={answers[current.id]} onSelect={selected => { if (finished.current) return; setAnswers(prev => ({ ...prev, [current.id]: selected })); trackActivity("exam.answer_selected", { subject: current.subject, grade: setup.grade, question: index + 1 }); }} />
    <div className="question-navigator" role="group" aria-label="Suala keç">{questions.map((q, i) => <button key={q.id} className={answers[q.id] !== undefined ? "answered" : ""} aria-label={`${i + 1}-ci sual${answers[q.id] !== undefined ? ", cavablanıb" : ", cavablanmayıb"}`} aria-current={index === i ? "step" : undefined} onClick={() => setIndex(i)}>{i + 1}</button>)}</div>
    {error && <p role="alert" className="kairo-card rounded-xl p-4">{error}</p>}
    <div className="flex flex-wrap gap-3"><Button variant="secondary" disabled={index === 0 || status === "saving"} onClick={() => setIndex(i => i - 1)}>Geri</Button>{index < questions.length - 1 && <Button onClick={() => setIndex(i => i + 1)}>Növbəti →</Button>}<Button disabled={answered !== questions.length || status === "saving"} onClick={() => void submit()}>{status === "saving" ? "Bazaya saxlanılır…" : "Sınağı tamamla"}</Button></div>
    <p className="kairo-muted text-sm">{questions.length - answered ? `Tamamlamaq üçün ${questions.length - answered} suala da cavab ver.` : "Bütün suallar cavablanıb. Hər fənnin nəticəsi ayrıca saxlanılacaq."}</p>
  </main><Footer /></div>;
}
