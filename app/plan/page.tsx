"use client";

import { useBrowserReady } from "@/hooks/use-browser-ready";
import Loading from "@/app/loading";

import { useEffect, useRef, useState } from "react";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Progress, Skeleton } from "@/components/ui/progress";
import { getMiniQuizAttempts, getPlanProgress, getQuizResult, getStudyPlan, savePlanProgress, saveStudyPlan } from "@/lib/storage";
import { isCurrentStudyPlan } from "@/lib/study-plan";
import { LearningResourceCards } from "@/components/ai/learning-resource-cards";
import Link from "next/link";
import { getTextbookById } from "@/lib/textbook-reference";
import type { StudyPlan, StudyPlanDay } from "@/lib/types";
import { CheckCircle2, Circle } from "lucide-react";

export default function PlanPage() {
  const ready = useBrowserReady();
  return ready ? <PlanContent /> : <Loading />;
}

function PlanContent() {
  const [resultLoaded, setResultLoaded] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(() => {
    if (typeof window === "undefined") return null;
    const savedPlan = getStudyPlan();
    const result = getQuizResult();
    if (result && isCurrentStudyPlan(savedPlan, result.submittedAt)) return savedPlan;
    return null;
  });
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [taskProgress, setTaskProgress] = useState<Record<string, boolean>>({});
  const [planError, setPlanError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const [dailyMinutes, setDailyMinutes] = useState(plan?.dailyMinutes ?? 60);
  const generating = useRef(false);
  const initialized = useRef(false);
  const [miniAttempts] = useState(() => typeof window === "undefined" ? [] : getMiniQuizAttempts());

  function dayTaskKey(day: number, task: string) {
    return `${day}:${task}`;
  }

  function getDayCompletion(day: StudyPlanDay): number {
    if (day.tasks.length === 0) return 0;
    const completed = day.tasks.filter((task) => taskProgress[dayTaskKey(day.day, task)]).length;
    return Math.round((completed / day.tasks.length) * 100);
  }

  function getOverallCompletion(currentPlan: StudyPlan): number {
    const totalTasks = currentPlan.days.reduce((sum, day) => sum + day.tasks.length, 0);
    if (totalTasks === 0) return 0;
    const completedTasks = currentPlan.days.reduce(
      (sum, day) => sum + day.tasks.filter((task) => taskProgress[dayTaskKey(day.day, task)]).length,
      0,
    );
    return Math.round((completedTasks / totalTasks) * 100);
  }

  function toggleTask(day: number, task: string) {
    setTaskProgress((prev) => {
      const key = dayTaskKey(day, task);
      const next = { ...prev, [key]: !prev[key] };
      if (typeof window !== "undefined") {
        if (plan) savePlanProgress(plan, next);
      }
      return next;
    });
  }

  async function generateAiPlan() {
    if (generating.current) return;
    const result = getQuizResult();
    setResultLoaded(Boolean(result));
    if (!result) return;
    generating.current = true;

    const textbookTopics = getTextbookById(result.textbookId)?.topics ?? [];
    setIsGenerating(true);
    setPlanError(null);

    try {
      const response = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: result.grade,
          subject: result.subject,
          weakTopics: result.weakTopics,
          level: result.level,
          targetImprovement: "Zəif mövzuları möhkəmləndirmək; artımı növbəti sınaqla ölçmək",
          dailyMinutes,
          resultSubmittedAt: result.submittedAt,
          curriculumTopics: textbookTopics,
          topicScores: result.topicScores.map((item) => ({ topic: item.topic, accuracy: item.accuracy })),
          errorPatterns: result.errorPatterns,
          recommendedNextQuiz: result.recommendedNextQuiz,
        }),
      });
      const data = (await response.json()) as { plan?: StudyPlan; error?: string };
      if (!response.ok || !data.plan) {
        throw new Error(data.error ?? "AI plan yaradıla bilmədi. Yenidən cəhd edin.");
      }
      setPlan(data.plan);
      setSelectedDay(data.plan.days[0]?.day ?? 1);
      setTaskProgress({});
      if (typeof window !== "undefined") {
        savePlanProgress(data.plan, {});
      }
      saveStudyPlan(data.plan);
      setPlanError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI plan alınmadı.";
      setPlanError(message);
    } finally {
      setIsGenerating(false);
      generating.current = false;
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const result = getQuizResult();
    setResultLoaded(Boolean(result));

    if (!result) return;
    if (!isCurrentStudyPlan(plan, result.submittedAt)) {
      generateAiPlan();
    } else {
      setTaskProgress(getPlanProgress(plan));
      setSelectedDay(plan.days[0]?.day ?? 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeDay = plan?.days.find((day) => day.day === selectedDay) ?? plan?.days[0] ?? null;
  const activeResources = activeDay?.resources ?? [];
  const checkpointAttempt = activeDay && plan ? miniAttempts.filter((attempt) => attempt.topic === activeDay.topic &&
    attempt.grade === getQuizResult()?.grade && (attempt.subject ?? "Riyaziyyat") === getQuizResult()?.subject &&
    attempt.submittedAt >= (plan.generatedAt ?? "")).at(-1) : undefined;

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 md:px-6">
        <div>
          <h1 className="text-3xl font-black md:text-4xl">Sənin üçün uyğunlaşdırılmış yol xəritəsi</h1>
          <p className="kairo-muted mt-2">Kliklənən dərs planı ilə material, test və video addımlarını izləyərək inkişaf et.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="daily-minutes" className="kairo-muted text-sm">Gündə ayıra bildiyin vaxt</label>
          <select id="daily-minutes" value={dailyMinutes} onChange={(event) => setDailyMinutes(Number(event.target.value))}
            disabled={isGenerating} className="kairo-input rounded-xl px-3 py-2 text-sm">
            {[30, 45, 60, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} dəqiqə</option>)}
          </select>
        </div>
        {planError ? <p role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-400">{planError}</p> : null}
        {!resultLoaded && !isGenerating ? (
          <div className="kairo-card rounded-2xl p-5">
            <p className="kairo-muted">Fərdi plan üçün əvvəlcə diaqnostik sınağı tamamla.</p>
            <Link href="/onboarding" className="mt-3 inline-block text-red-400 underline">Sınağa başla</Link>
          </div>
        ) : !plan || isGenerating ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Button variant="secondary" onClick={generateAiPlan} disabled={isGenerating}>
              {isGenerating ? "AI plan hazırlanır..." : "Yenidən AI plan yarat"}
            </Button>
          </div>
        ) : (
          <>
            <div className="kairo-card rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{plan.title}</h2>
                  <p className="kairo-muted mt-2">{plan.summary}</p>
                </div>
                <div className="min-w-44 space-y-2">
                  <p className="text-sm font-semibold">Ümumi tamamlanma: {getOverallCompletion(plan)}%</p>
                  <Progress value={getOverallCompletion(plan)} />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setShowWhy((prev) => !prev)}>
                  Bu plan niyə seçilib?
                </Button>
                {showWhy ? (
                  <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {plan.summary}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              <aside className="kairo-card rounded-2xl p-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-red-400">Günlər</h3>
                <div className="mt-4 space-y-3">
                  {plan.days.map((day) => {
                    const completion = getDayCompletion(day);
                    const isActive = activeDay?.day === day.day;

                    return (
                      <button
                        key={day.day}
                        type="button"
                        onClick={() => setSelectedDay(day.day)}
                        className={`w-full rounded-xl border p-3 text-left transition ${
                          isActive
                            ? "border-red-400/70 bg-red-500/10"
                            : "border-white/10 bg-zinc-900/40 hover:border-red-400/40 hover:bg-red-500/5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">Gün {day.day}</p>
                          <span className="text-xs text-red-400">{completion}%</span>
                        </div>
                        <p className="kairo-muted mt-1 line-clamp-2 text-sm">{day.focus}</p>
                        <Progress value={completion} className="mt-3" />
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="space-y-5">
                {activeDay ? (
                  <>
                    <div className="kairo-card rounded-2xl p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xl font-semibold">Gün {activeDay.day}: {activeDay.focus}</h3>
                        <span className="rounded-full border border-red-400/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                          {activeDay.estimatedMinutes} dəqiqə
                        </span>
                      </div>
                      <p className="kairo-muted mt-2 text-sm">Tapşırıqları bitirdikcə işarələ, sistem avtomatik progress hesablayacaq.</p>

                      <div className="mt-4 space-y-2">
                        {activeDay.tasks.map((task) => {
                          const key = dayTaskKey(activeDay.day, task);
                          const done = Boolean(taskProgress[key]);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleTask(activeDay.day, task)}
                              className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-zinc-900/40 p-3 text-left transition hover:border-red-400/40 hover:bg-red-500/5"
                            >
                              {done ? <CheckCircle2 className="mt-0.5 h-5 w-5 text-red-400" /> : <Circle className="mt-0.5 h-5 w-5 text-zinc-500" />}
                              <span className={`text-sm ${done ? "line-through text-zinc-400" : "text-zinc-100"}`}>{task}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {activeDay.checkpoint ? <p className="kairo-card rounded-2xl p-4 text-sm">Yoxlama günü: aşağıdakı 8 suallıq testi tamamla. Nəticə ən azı 70% olduqda növbəti mərhələyə keç; əks halda səhvləri təkrar et.</p> : null}
                    {activeDay.checkpoint && checkpointAttempt ? <p className="kairo-card rounded-2xl p-4 text-sm">Son yoxlama: {checkpointAttempt.correct}/{checkpointAttempt.total} düzgün cavab. {checkpointAttempt.correct / checkpointAttempt.total >= 0.7 ? "Yoxlama keçildi — növbəti mərhələyə hazırsan." : "Qaydaları və səhvlərini təkrar et, sonra yenidən yoxla."}</p> : null}
                    <LearningResourceCards resources={activeResources} />
                  </>
                ) : null}
              </section>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={generateAiPlan} disabled={isGenerating}>
                {isGenerating ? "Yenilənir..." : "Planı AI ilə yenilə"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setTaskProgress({});
                  savePlanProgress(plan, {});
                }}
              >
                Progressi sıfırla
              </Button>
            </div>
            {plan.tips.length ? <ul className="kairo-card list-inside list-disc space-y-2 rounded-2xl p-5 text-sm">{plan.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul> : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
