"use client";

import { useBrowserReady } from "@/hooks/use-browser-ready";
import Loading from "@/app/loading";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AIQuestionGeneratorPanel } from "@/components/ai/ai-question-generator-panel";
import { TopicPerformanceChart } from "@/components/charts/topic-performance-chart";
import { DashboardCards, RecentActivity, RecommendedNextStep } from "@/components/dashboard/dashboard-cards";
import { LearningPathCard } from "@/components/dashboard/learning-path-card";
import { RecommendationCard } from "@/components/results/insight-components";
import { useLocale } from "@/hooks/use-locale";
import { getNextLearningAction } from "@/lib/learning-system";
import { getActivity, getFeedback, getPlanProgress, getQuizQuestions, getQuizResult, getStudyPlan, savePendingQuiz } from "@/lib/storage";
import { getPlanCompletion, isCurrentStudyPlan } from "@/lib/study-plan";
import { ScorePredictionCard } from "@/components/results/summary-cards";

export default function DashboardPage() {
  const ready = useBrowserReady();
  return ready ? <DashboardContent /> : <Loading />;
}

function DashboardContent() {
  const { t } = useLocale();
  const router = useRouter();
  const [result] = useState(() => (typeof window === "undefined" ? null : getQuizResult()));
  const [plan] = useState(() => {
    const saved = typeof window === "undefined" ? null : getStudyPlan();
    return result && isCurrentStudyPlan(saved, result.submittedAt) ? saved : null;
  });
  const [events] = useState(() => typeof window === "undefined" ? [] : getActivity());
  const [progress] = useState(() => plan ? getPlanProgress(plan) : {});
  const [feedback] = useState(() => (typeof window === "undefined" ? null : getFeedback()));
  const [existingQuestions] = useState(() =>
    typeof window === "undefined" ? [] : (getQuizQuestions() ?? []).map((q) => q.question),
  );

  const weakTopics = useMemo(() => result?.weakTopics ?? [], [result]);

  if (!result) {
    return (
      <div className="kairo-page">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-20">{t.dashboard.noData}</main>
      </div>
    );
  }

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-10 md:px-6">
        <h1 className="text-3xl font-black md:text-4xl">{t.dashboard.title}</h1>

        <DashboardCards result={result} completion={getPlanCompletion(plan, progress)} />
        <ScorePredictionCard result={result} />

        <div className="grid gap-5 md:grid-cols-2">
          <TopicPerformanceChart data={result.topicScores} />
          <div className="space-y-5">
            <AIQuestionGeneratorPanel
              endpoint="/api/ai/adaptive"
              payload={{
                grade: result.grade,
                subject: result.subject,
                weakTopics: weakTopics.length ? weakTopics : result.topicScores.map((item) => item.topic),
                level: result.level,
                count: 4,
                existingQuestions,
              }}
              title={t.dashboard.adaptiveWidget}
              onGenerated={(questions) => {
                savePendingQuiz(questions);
                router.push("/quiz");
              }}
            />
            <RecommendedNextStep text={feedback?.nextStep ?? result.recommendedNextQuiz} />
          </div>
        </div>

        <RecommendationCard text={`${t.dashboard.nextQuizFocus}: ${result.recommendedNextQuiz}`} />
        <LearningPathCard result={result} />

        {plan ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{t.dashboard.planSnapshot}</p>
            <h2 className="mt-2 text-xl font-semibold text-white">{plan.title}</h2>
            <p className="mt-2 text-zinc-300">{plan.summary}</p>
          </div>
        ) : null}

        <RecommendedNextStep text={getNextLearningAction(result)} />

        <RecentActivity events={events} />
      </main>
      <Footer />
    </div>
  );
}
