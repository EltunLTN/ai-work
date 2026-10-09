import type { AnalysisResult, Question, QuizAnswers, StudyPlan } from "@/lib/types";

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

  const weakTopics = ranked.filter((item) => item.accuracy < 65).map((item) => item.topic).slice(0, 3);
  const strongTopics = ranked.filter((item) => item.accuracy >= 75).map((item) => item.topic).slice(0, 3);

  const primaryWeak = weakTopics[0] ?? "əsas hesablama bacarıqları";
  const primaryStrong = strongTopics[0] ?? "qayda yaddaşı";

  return {
    weakTopics,
    strongTopics,
    feedback: `Sənin əsas zəifliyin ${primaryWeak} mövzusunda tətbiq mərhələsidir. ${primaryStrong} mövzusunda isə performansın stabildir. Növbəti 2 gün zəif mövzu üzrə hədəfli praktikaya fokuslan.`,
    nextStep: `${primaryWeak} mövzusunda 20 dəqiqə qayda təkrarı + 25 dəqiqə test bloku et, sonra mini quiz ilə yoxla.`,
  };
}

export function generateStudyPlan(analysis: AnalysisResult): StudyPlan {
  const weak = analysis.weakTopics.length ? analysis.weakTopics : ["Əsas riyazi əməliyyatlar", "Tənliklər", "Funksiyalar"];
  const totalDays = Math.min(7, Math.max(3, weak.length + 2));

  const days = Array.from({ length: totalDays }).map((_, i) => {
    const day = i + 1;
    const focus = weak[i % weak.length];

    if (day === totalDays) {
      return {
        day,
        focus: "Yekun yoxlama və möhkəmləndirmə",
        estimatedMinutes: 75,
        tasks: [
          "25 suallıq qarışıq mini sınaq",
          "Səhv etdiyin sualları izahla yenidən həll et",
          `Növbəti həftə üçün prioritet mövzu seç: ${weak[0]}`,
        ],
      };
    }

    return {
      day,
      focus,
      estimatedMinutes: 55 + (day % 3) * 10,
      tasks: [
        `${focus} üzrə 15 dəqiqə qayda və formul təkrarı`,
        `${focus} üzrə 12-15 DİM tipli sual həlli`,
        "Səhv cavabları qeyd et və qısa səbəb yaz",
      ],
    };
  });

  return {
    title: "AI Dynamic Study Plan",
    summary: "Plan nəticə analizinə görə dinamik yaradılıb və zəif mövzulara prioritet verir.",
    days,
    tips: [
      "Hər gün ən az 1 səhvi səbəbi ilə birlikdə yaz.",
      "Qısa, fokuslu bloklar uzun və dağınıq çalışmadan daha effektivdir.",
      "Hər 2 gündə bir mini quiz ilə özünü yoxla.",
    ],
  };
}
