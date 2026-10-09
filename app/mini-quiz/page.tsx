"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { QuizCard } from "@/components/quiz/quiz-card";
import { QuizProgress } from "@/components/quiz/quiz-progress";
import { Button } from "@/components/ui/button";
import { getStudentProfile } from "@/lib/storage";
import type { Question, QuizAnswers } from "@/lib/types";

export default function MiniQuizPage() {
  const router = useRouter();
  const params = useSearchParams();
  const topic = params.get("topic") ?? "Ümumi mövzu";

  const [profile] = useState(() => (typeof window === "undefined" ? null : getStudentProfile()));
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!questions.length) return 0;
    const correct = questions.filter((q) => answers[q.id] === q.correctIndex).length;
    return Math.round((correct / questions.length) * 100);
  }, [questions, answers]);

  async function startMiniQuiz() {
    if (!profile) {
      router.push("/onboarding");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSubmitted(false);

    try {
      const response = await fetch("/api/ai/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grade: profile.grade,
          subject: profile.subject,
          topics: [topic],
          level: "intermediate",
          count: 8,
        }),
      });

      const data = (await response.json()) as { questions?: Question[]; error?: string };
      if (!response.ok || !data.questions?.length) {
        throw new Error(data.error ?? "Mini quiz sualları yaradıla bilmədi.");
      }

      setQuestions(data.questions);
      setAnswers({});
      setIndex(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Mini quiz xətası baş verdi.";
      setError(message);
      setQuestions([]);
    } finally {
      setIsLoading(false);
    }
  }

  const current = questions[index];
  const answered = useMemo(() => questions.filter((q) => answers[q.id] !== undefined).length, [questions, answers]);

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10 md:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black">Mövzu mini quiz</h1>
          <p className="kairo-muted">Mövzu: {topic}</p>
          <p className="kairo-muted text-sm">Bu mini test seçilmiş mövzu üzrə qısa yoxlama üçündür.</p>
        </div>

        {!questions.length ? (
          <div className="kairo-card rounded-2xl p-5">
            <Button onClick={startMiniQuiz} disabled={isLoading}>
              {isLoading ? "Mini quiz yaradılır..." : "Mini quizə başla"}
            </Button>
            {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
          </div>
        ) : (
          <>
            <QuizProgress answered={answered} total={questions.length} />

            <QuizCard
              question={current}
              questionNumber={index + 1}
              total={questions.length}
              selectedIndex={answers[current.id]}
              onSelect={(selected) => setAnswers((prev) => ({ ...prev, [current.id]: selected }))}
            />

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => setIndex((v) => Math.max(0, v - 1))}>
                Geri
              </Button>
              {index < questions.length - 1 ? (
                <Button onClick={() => setIndex((v) => Math.min(questions.length - 1, v + 1))}>Növbəti</Button>
              ) : (
                <Button onClick={() => setSubmitted(true)}>Nəticəni göstər</Button>
              )}
              <Button variant="ghost" onClick={startMiniQuiz} disabled={isLoading}>
                Yeni mini quiz
              </Button>
            </div>

            {submitted ? (
              <div className="kairo-card rounded-2xl p-5">
                <p className="text-lg font-semibold">Nəticə: {score}%</p>
                <p className="kairo-muted mt-1 text-sm">
                  {score >= 70
                    ? "Əla! Bu mövzuda sabitlik var, daha çətin suallara keçə bilərsən."
                    : "Bu mövzuya aid konspekt və videonu izləyib mini quiz-i yenidən et."}
                </p>
              </div>
            ) : null}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
