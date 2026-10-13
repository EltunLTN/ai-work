import type { AnalysisResult, Question, QuizAnswers } from "@/lib/types";

export function analyzeResults(answers: QuizAnswers, questions: Question[]): AnalysisResult {
  const byTopic = new Map<string, { correct: number; total: number }>();

  for (const q of questions) {
    const selected = answers[q.id];
    const current = byTopic.get(q.topic) ?? { correct: 0, total: 0 };
    current.total += 1;
    if (selected === q.correctIndex) current.correct += 1;
    byTopic.set(q.topic, current);
  }

  const ranked = [...byTopic.entries()]
    .map(([topic, stats]) => ({
      topic,
      accuracy: stats.total ? Math.round((stats.correct / stats.total) * 100) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy);

  const weakTopics = [...ranked].reverse().filter((item) => item.accuracy < 60).map((item) => item.topic).slice(0, 3);
  const strongTopics = ranked.filter((item) => item.accuracy >= 75).map((item) => item.topic).slice(0, 3);

  const primaryWeak = weakTopics[0];
  return {
    weakTopics,
    strongTopics,
    feedback: questions.length
      ? `${questions.length} sualda ${questions.filter((q) => answers[q.id] === q.correctIndex).length} düzgün cavab. ${weakTopics.length ? `60%-dən aşağı nəticəli mövzular: ${weakTopics.join(", ")}.` : "Bu sınaqda 60%-dən aşağı nəticəli mövzu yoxdur."} Bu, yalnız həll edilmiş sualların statistikasıdır.`
      : "Analiz üçün hələ sınaq nəticəsi yoxdur.",
    nextStep: primaryWeak
      ? `${primaryWeak} mövzusunun qaydalarını təkrar et, sonra 8 suallıq mini testlə yoxla.`
      : "Əhatə edilməmiş mövzuları da yoxla və daha çətin suallarla məşq et.",
  };
}
