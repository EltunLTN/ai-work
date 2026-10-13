"use client";

import { useBrowserReady } from "@/hooks/use-browser-ready";
import Loading from "@/app/loading";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { TopicPerformanceChart } from "@/components/charts/topic-performance-chart";
import { AIInsightCard } from "@/components/results/ai-insight-card";
import { GamificationCard } from "@/components/results/gamification-card";
import {
  FeedbackBox,
  LevelBadge,
  RecommendationCard,
  ResultsSummary,
  WeaknessCard,
} from "@/components/results/insight-components";
import { ScorePredictionCard } from "@/components/results/summary-cards";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { analyzeResults } from "@/lib/ai-learning";
import { buildResultSummaryAz } from "@/lib/analytics";
import {
  getAnalysis,
  getFeedback,
  getGamification,
  getResultReview,
  getQuizResult,
  saveFeedback,
  clearStudyPlan,
} from "@/lib/storage";
import type { AnalysisResult, FeedbackSummary, Question, QuizAnswers, QuizResult } from "@/lib/types";

export default function ResultsPage() {
  const ready = useBrowserReady();
  return ready ? <ResultsContent /> : <Loading />;
}

function ResultsContent() {
  const { t } = useLocale();
  const [result] = useState<QuizResult | null>(() => (typeof window === "undefined" ? null : getQuizResult()));
  const [feedback, setFeedback] = useState<FeedbackSummary | null>(() =>
    typeof window === "undefined" ? null : getFeedback(),
  );
  const [analysis] = useState<AnalysisResult>(() =>
    typeof window === "undefined" ? analyzeResults({}, []) : (getAnalysis() ?? analyzeResults(getResultReview().answers, getResultReview().questions)),
  );
  const [reviewQuestions] = useState<Question[]>(() =>
    typeof window === "undefined" ? [] : getResultReview().questions,
  );
  const [reviewAnswers] = useState<QuizAnswers>(() =>
    typeof window === "undefined" ? {} : getResultReview().answers,
  );
  const [gamification] = useState(() =>
    typeof window === "undefined" ? null : getGamification(),
  );
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  async function loadFeedback() {
    if (!result) return;
    setFeedbackError(null);
    try {
      const response = await fetch("/api/ai/feedback-summary", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result, review: reviewQuestions.map((question) => ({
          topic: question.topic,
          question: question.question,
          selectedAnswer: question.options[reviewAnswers[question.id]] ?? "Cavab verilməyib",
          correctAnswer: question.options[question.correctIndex],
        })) }),
      });
      const data = await response.json() as { feedback?: FeedbackSummary; error?: string };
      if (!response.ok || !data.feedback) throw new Error(data.error ?? "AI analizi alınmadı.");
      setFeedback(data.feedback);
      saveFeedback(data.feedback, result.submittedAt);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "AI analizi alınmadı.");
    }
  }

  useEffect(() => {
    if (result && !feedback) loadFeedback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const summary = useMemo(() => (result ? buildResultSummaryAz(result) : ""), [result]);
  const reviewedItems = useMemo(
    () =>
      reviewQuestions.map((question) => {
        const selectedIndex = reviewAnswers[question.id];
        const selectedText = selectedIndex === undefined ? "Cavab verilməyib" : (question.options[selectedIndex] ?? "-");
        const correctText = question.options[question.correctIndex] ?? "-";
        return {
          id: question.id,
          topic: question.topic,
          question: question.question,
          selectedText,
          correctText,
          explanation: question.explanation,
          isCorrect: selectedIndex === question.correctIndex,
        };
      }),
    [reviewAnswers, reviewQuestions],
  );

  if (!result) {
    return (
      <div className="kairo-page">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-20">{t.results.noResult}</main>
      </div>
    );
  }

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black md:text-4xl">{t.results.title}</h1>
            <p className="mt-2 max-w-3xl text-zinc-400">{summary}</p>
          </div>
          <LevelBadge level={result.level} />
        </div>

        <ResultsSummary result={result} />

        <AIInsightCard analysis={feedback ? {
          weakTopics: result.weakTopics,
          strongTopics: result.topicScores.filter((item) => item.accuracy >= 75).map((item) => item.topic),
          feedback: feedback.summary,
          nextStep: feedback.nextStep,
        } : analysis} isAi={Boolean(feedback)} />

        {gamification ? <GamificationCard state={gamification} /> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <TopicPerformanceChart data={result.topicScores} />
          <div className="space-y-4">
            <ScorePredictionCard result={result} />
            <RecommendationCard text={result.recommendedNextQuiz} />
          </div>
        </div>

        <WeaknessCard result={result} />
        {feedback ? <FeedbackBox feedback={feedback} /> : null}
        {feedbackError ? (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
            {feedbackError}
            <Button variant="ghost" onClick={loadFeedback}>AI analizini yenidən yoxla</Button>
          </div>
        ) : null}

        {reviewedItems.length ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Sual baxışı: harada səhv etmisən</h2>
            <div className="space-y-3">
              {reviewedItems.map((item) => (
                <article key={item.id} className="kairo-card rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-red-400">{item.topic}</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.isCorrect
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-red-500/15 text-red-300"
                      }`}
                    >
                      {item.isCorrect ? "Düzgün" : "Səhv"}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold">{item.question}</p>
                  <p className="kairo-muted mt-2 text-sm">Sənin cavabın: {item.selectedText}</p>
                  <p className="mt-1 text-sm text-emerald-300">Düzgün cavab: {item.correctText}</p>
                  <p className="kairo-muted mt-2 text-sm">AI izahı: {item.explanation}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <div className="flex gap-3">
          <Link href="/plan">
            <Button
              onClick={clearStudyPlan}
            >
              Yeni AI plan yarat
            </Button>
          </Link>
          <Link href="/plan">
            <Button variant="secondary">{t.results.openPlan}</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">{t.results.openDashboard}</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
