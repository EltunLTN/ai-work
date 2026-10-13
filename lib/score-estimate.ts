import type { DiagnosticResult } from "@/lib/types";

export function estimatePerformance(result: Pick<DiagnosticResult, "totalQuestions" | "totalCorrect" | "topicScores">) {
  const n = result.totalQuestions;
  if (!Number.isInteger(n) || n < 1 || !Number.isInteger(result.totalCorrect) ||
      result.totalCorrect < 0 || result.totalCorrect > n) return null;

  const p = result.totalCorrect / n;
  // Wilson 95% interval: uncertainty decreases with the number of observed answers.
  const z = 1.96;
  const denominator = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denominator;
  const radius = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator;
  return {
    score: Math.round(p * 100),
    lower: Math.max(0, Math.floor((center - radius) * 100)),
    upper: Math.min(100, Math.ceil((center + radius) * 100)),
    sampleSize: n,
    topicsAssessed: result.topicScores.length,
    scale: 100,
    method: "Wilson 95%",
    limitation: "Bu, yalnız həll edilmiş məşq suallarının göstəricisidir. Suallar kalibrasiya olunmadığı və bütün imtahanı əhatə etmədiyi üçün rəsmi DİM balı proqnozlaşdırılmır.",
  };
}
