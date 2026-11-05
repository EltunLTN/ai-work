"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { kairo } from "@/lib/kairo/client";
import { aiFetch } from "@/lib/supabase/client";
import type { StudyPlan } from "@/lib/types";
import { LearningResourceCards } from "@/components/ai/learning-resource-cards";
import { Notice } from "./shared";
export function ExamStudyPlan({
  id,
  subjects,
  grade,
  initialSubject,
  autoGenerate = false,
}: {
  id: string;
  subjects: string[];
  grade: number;
  initialSubject?: string;
  autoGenerate?: boolean;
}) {
  const [subject, setSubject] = useState(initialSubject&&subjects.includes(initialSubject)?initialSubject:subjects[0]),
    [plan, setPlan] = useState<StudyPlan | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const running=useRef(false),autoAttempted=useRef(false),firstSubject=useRef(subject);
  const generate=useCallback(async () => {
    if(running.current)return;
    running.current=true;
    setBusy(true);
    setError("");
    try {
      const res = await aiFetch("/api/ai/exam-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, subject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error??"Plan hazırlanmadı.");
      setPlan(data.plan);
    } catch (e) { setError((e as Error).message); }
    finally {running.current=false;setBusy(false);}
  },[id,subject]);
  useEffect(() => {
    let live = true;
    void kairo<{ plan: StudyPlan | null }>("exam.plan.get", { id, subject })
      .then((r) => {
        if (!live)return;
        setPlan(r.plan);
        setLoading(false);
        if(!r.plan&&autoGenerate&&subject===firstSubject.current&&!autoAttempted.current){autoAttempted.current=true;void generate();}
      })
      .catch((e) => {
        if (live) {setError(e.message);setLoading(false);}
      });
    return () => {
      live = false;
    };
  }, [id, subject, autoGenerate, generate]);
  return (
    <section className="module-panel">
      <div className="admin-toolbar">
        <h2>Bu nəticəyə uyğun 7 günlük plan</h2>
        <label className="sr-only" htmlFor="exam-plan-subject">
          Planın fənni
        </label>
        <select
          id="exam-plan-subject"
          className="module-button"
          disabled={busy||loading}
          value={subject}
          onChange={(e) => {
            setSubject(e.target.value);
            setPlan(null);
            setLoading(true);
            setError("");
          }}
        >
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <p>
        Plan yekun server nəticənə əsaslanır, hesabında saxlanır və mövzuya
        uyğun yoxlanmış resursları istifadə edir.
      </p>
      {error && <Notice error>{error}</Notice>}
      {loading?<p role="status">Hesabındakı plan yoxlanılır…</p>:!plan ? (
        <button
          className="module-button primary"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy ? "Mövzular və resurslar hazırlanır…" : "Fərdi planımı hazırla"}
        </button>
      ) : (
        <>
          <h3>{plan.title}</h3>
          <p>{plan.summary}</p>
          {plan.days.map((day) => (
            <details className="admin-entry" key={day.day}>
              <summary>
                {day.day}-ci gün · {day.focus} · {day.estimatedMinutes} dəq
              </summary>
              <ul className="exam-plan-tasks">
                {day.tasks.map((task, i) => (
                  <li key={i}>{task}</li>
                ))}
              </ul>
              <div className="module-actions">
                <Link
                  className="module-button"
                  href={`/kairo/focus?subject=${encodeURIComponent(subject)}&task=${encodeURIComponent(day.topic ?? day.focus)}&return_path=/plan`}
                >
                  Fokusla başla
                </Link>
                <Link
                  className="module-button"
                  href={`/onboarding?subject=${encodeURIComponent(subject)}&grade=${grade}&topic=${encodeURIComponent(day.topic ?? "")}`}
                >
                  Mövzunu məşq et
                </Link>
              </div>
              <LearningResourceCards resources={day.resources ?? []} />
            </details>
          ))}
        </>
      )}
    </section>
  );
}
