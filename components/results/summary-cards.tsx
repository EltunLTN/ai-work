import type { DiagnosticResult, FeedbackSummary } from "@/lib/types";
import { ResultsSummary, StudyPlanTimeline } from "@/components/results/insight-components";
import { estimatePerformance } from "@/lib/score-estimate";

export function ResultSummaryCard({ result }: { result: DiagnosticResult }) {
  return <ResultsSummary result={result} />;
}

export function ScorePredictionCard({ result }: { result: DiagnosticResult }) {
  const estimate = estimatePerformance(result);
  return (
    <div className="rounded-3xl border border-red-400/30 bg-gradient-to-r from-red-500/15 to-transparent p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Nəticəyə əsaslanan qiymətləndirmə</p>
      <h3 className="mt-3 text-xl font-semibold">Məşq göstəricisi: {estimate ? `${estimate.score}/100` : "Məlumat kifayət deyil"}</h3>
      {estimate ? <>
        <p className="mt-2 text-sm text-zinc-300">{estimate.sampleSize} sual · {estimate.topicsAssessed} mövzu · {result.totalCorrect} düzgün cavab</p>
        <p className="mt-2 text-sm text-zinc-300">Statistik interval: {estimate.lower}–{estimate.upper}/100 (95%)</p>
        <p className="mt-3 text-xs leading-relaxed text-zinc-400">{estimate.limitation}</p>
      </> : null}
    </div>
  );
}

export function FeedbackPanel({ feedback }: { feedback: FeedbackSummary }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <p className="text-sm uppercase tracking-[0.22em] text-zinc-500">AI feedback</p>
      <h3 className="mt-3 text-2xl font-semibold text-white">{feedback.headline}</h3>
      <p className="mt-3 text-zinc-300">{feedback.summary}</p>
      <p className="mt-4 text-sm text-red-300">Növbəti addım: {feedback.nextStep}</p>
    </div>
  );
}

export { StudyPlanTimeline };
