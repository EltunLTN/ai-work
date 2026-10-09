"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { AIQuestionGeneratorPanel } from "@/components/ai/ai-question-generator-panel";
import { QuizCard } from "@/components/quiz/quiz-card";
import { QuizProgress } from "@/components/quiz/quiz-progress";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { analyzeResults } from "@/lib/ai-learning";
import { evaluateDiagnostic } from "@/lib/analytics";
import { demoQuestions } from "@/lib/mock-data";
import { getTextbookById, getTopicsForProfile } from "@/lib/textbook-reference";
import {
  appendQuestionHistory,
  getQuestionHistory,
  getStudentProfile,
  saveAnalysis,
  saveQuizAnswers,
  saveQuizQuestions,
  saveQuizResult,
} from "@/lib/storage";
import type { Question, QuizAnswers, StudentProfile } from "@/lib/types";

export default function QuizPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [profile] = useState<StudentProfile | null>(() =>
    typeof window === "undefined" ? null : getStudentProfile(),
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadDiagnosticQuestions() {
    if (!profile) {
      router.push("/onboarding");
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const topics = profile.selectedTopics.length ? profile.selectedTopics : getTopicsForProfile(profile);
    const textbook = getTextbookById(profile.textbookId);

    try {
      const response = await fetch("/api/ai/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: profile.grade,
          subject: profile.subject,
          topics,
          count: 8,
          referenceSource: textbook?.sourceUrl,
          excludedQuestionStems: getQuestionHistory(),
        }),
      });
      const data = (await response.json()) as { questions?: Question[]; error?: string };
      if (!response.ok || !data.questions?.length) {
        throw new Error(data.error ?? "AI sualları hazır deyil.");
      }
      setQuestions(data.questions);
      saveQuizQuestions(data.questions);
      appendQuestionHistory(data.questions.map((q) => q.question));
      setAnswers({});
      setIndex(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI sual generasiyası alınmadı.";
      setLoadError(`${message} Demo sualları aktiv edildi.`);
      setQuestions(demoQuestions);
      saveQuizQuestions(demoQuestions);
      appendQuestionHistory(demoQuestions.map((q) => q.question));
      setIndex(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDiagnosticQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, router]);

  const current = questions[index];
  const answered = useMemo(() => questions.filter((q) => answers[q.id] !== undefined).length, [questions, answers]);

  const adaptiveState = useMemo(() => {
    const wrongByTopic = new Map<string, number>();
    let correct = 0;
    let attempted = 0;

    for (const q of questions) {
      const selected = answers[q.id];
      if (selected === undefined) continue;
      attempted += 1;
      if (selected === q.correctIndex) {
        correct += 1;
      } else {
        wrongByTopic.set(q.topic, (wrongByTopic.get(q.topic) ?? 0) + 1);
      }
    }

    const accuracy = attempted ? Math.round((correct / attempted) * 100) : 50;
    const weakTopics = [...wrongByTopic.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map((item) => item[0]);

    const level = accuracy < 40 ? "beginner" : accuracy <= 70 ? "intermediate" : "advanced";
    return { level, weakTopics };
  }, [questions, answers]);

  if (!profile || isLoading) {
    return (
      <div className="kairo-page">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-16">{t.quiz.loading}</main>
      </div>
    );
  }

  if (loadError || !current) {
    return (
      <div className="kairo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-16">
          <h1 className="text-3xl font-black">{t.quiz.failed}</h1>
          <p className="text-zinc-300">{loadError ?? t.quiz.notReady}</p>
          <Button onClick={loadDiagnosticQuestions}>{t.quiz.retry}</Button>
        </main>
      </div>
    );
  }

  function submit() {
    if (!profile) return;
    const result = evaluateDiagnostic(questions, answers, profile);
    const analysis = analyzeResults(answers, questions);
    saveQuizAnswers(answers);
    saveQuizResult(result);
    saveAnalysis(analysis);
    router.push("/results");
  }

  const textbook = getTextbookById(profile.textbookId);

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 md:px-6">
        <div>
          <h1 className="text-3xl font-black">{t.quiz.title}</h1>
          <p className="mt-2 text-zinc-400">
            {profile.grade}-ci sinif {profile.subject} | {textbook?.title}
          </p>
        </div>

        <QuizProgress answered={answered} total={questions.length} />

        <AIQuestionGeneratorPanel
          endpoint="/api/ai/adaptive"
          title={t.quiz.adaptiveWidget}
          payload={{
            grade: profile.grade,
            subject: profile.subject,
            weakTopics: adaptiveState.weakTopics.length ? adaptiveState.weakTopics : profile.selectedTopics.slice(0, 2),
            level: adaptiveState.level,
            count: 4,
            existingQuestions: questions.map((q) => q.question),
          }}
          onGenerated={(newQuestions) => {
            const seenCurrent = new Set(questions.map((item) => item.question.trim().toLowerCase()));
            const uniqueFresh = newQuestions.filter((item) => !seenCurrent.has(item.question.trim().toLowerCase()));
            const nextQuestions = uniqueFresh.length ? uniqueFresh : newQuestions;

            setQuestions(nextQuestions);
            saveQuizQuestions(nextQuestions);
            appendQuestionHistory(nextQuestions.map((q) => q.question));
            setAnswers({});
            setIndex(0);
          }}
        />

        <QuizCard
          question={current}
          questionNumber={index + 1}
          total={questions.length}
          selectedIndex={answers[current.id]}
          onSelect={(selected) => setAnswers((prev) => ({ ...prev, [current.id]: selected }))}
        />

        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setIndex((v) => Math.max(0, v - 1))}>
            {t.quiz.back}
          </Button>
          {index < questions.length - 1 ? (
            <Button onClick={() => setIndex((v) => Math.min(questions.length - 1, v + 1))}>{t.quiz.next}</Button>
          ) : (
            <Button onClick={submit}>{t.quiz.finish}</Button>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
