import type {
  DiagnosticResult,
  Question,
  QuizAnswers,
  StudentLevel,
  StudentProfile,
  TopicScore,
} from "@/lib/types";

function pct(value: number): number {
  return Math.round(value * 100);
}

export function detectLevel(overallAccuracy: number): StudentLevel {
  if (overallAccuracy < 40) return "beginner";
  if (overallAccuracy <= 70) return "intermediate";
  return "advanced";
}

function summarizeErrorPatterns(questions: Question[], answers: QuizAnswers): string[] {
  const wrongByTopic = new Map<string, number>();

  for (const question of questions) {
    if (answers[question.id] === question.correctIndex) continue;
    wrongByTopic.set(question.topic, (wrongByTopic.get(question.topic) ?? 0) + 1);
  }

  const patterns: string[] = [];
  for (const [topic, wrong] of wrongByTopic.entries()) {
    if (wrong >= 2) patterns.push(`${topic} mövzusunda təkrarlanan səhv nümunəsi var.`);
  }

  if (patterns.length === 0) {
    patterns.push("Səhvlər fərqli mövzulara yayılıb, prioritet plan ilə sürətli bərpa mümkündür.");
  }

  return patterns;
}

export function evaluateDiagnostic(
  questions: Question[],
  answers: QuizAnswers,
  profile: StudentProfile,
): DiagnosticResult {
  const totalQuestions = questions.length;
  const totalCorrect = questions.filter((q) => answers[q.id] === q.correctIndex).length;
  const totalWrong = totalQuestions - totalCorrect;
  const overallAccuracy = totalQuestions ? pct(totalCorrect / totalQuestions) : 0;

  const topicList = Array.from(new Set(questions.map((q) => q.topic)));
  const topicScores: TopicScore[] = topicList.map((topic) => {
    const list = questions.filter((q) => q.topic === topic);
    const correct = list.filter((q) => answers[q.id] === q.correctIndex).length;
    return {
      topic,
      correct,
      total: list.length,
      accuracy: list.length ? pct(correct / list.length) : 0,
    };
  });

  const ranked = [...topicScores].sort((a, b) => b.accuracy - a.accuracy);
  const strongestTopic = ranked[0]?.topic ?? "-";
  const weakestTopic = ranked[ranked.length - 1]?.topic ?? "-";
  const weakTopics = ranked.filter((item) => item.accuracy < 60).map((item) => item.topic);
  const level = detectLevel(overallAccuracy);
  const predictedScore = Math.round(280 + overallAccuracy * 3.1 - weakTopics.length * 8);
  const potentialScore = Math.min(700, predictedScore + 60 + Math.max(0, 70 - overallAccuracy));

  return {
    grade: profile.grade,
    subject: profile.subject,
    textbookId: profile.textbookId,
    totalQuestions,
    totalCorrect,
    totalWrong,
    overallAccuracy,
    level,
    topicScores,
    strongestTopic,
    weakestTopic,
    weakTopics,
    errorPatterns: summarizeErrorPatterns(questions, answers),
    predictedScore,
    potentialScore,
    recommendedNextQuiz: weakTopics.length
      ? `${weakTopics[0]} və ${weakTopics[1] ?? weakTopics[0]} mövzularında adaptiv mini-quiz`
      : "Çətinlik səviyyəsi artırılmış qarışıq quiz",
    submittedAt: new Date().toISOString(),
  };
}

export function buildResultSummaryAz(result: DiagnosticResult): string {
  return `Ümumi dəqiqlik ${result.overallAccuracy}% oldu və səviyyən ${result.level} kimi qiymətləndirildi. Ən güclü mövzu ${result.strongestTopic}, əsas inkişaf sahəsi isə ${result.weakestTopic}-dur.`;
}
