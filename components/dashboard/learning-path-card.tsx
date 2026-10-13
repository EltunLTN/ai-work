import { getLearningPath } from "@/lib/learning-system";
import { useLocale } from "@/hooks/use-locale";
import type { DiagnosticResult } from "@/lib/types";

export function LearningPathCard({ result }: { result: DiagnosticResult }) {
  const { t } = useLocale();
  const stages = getLearningPath(result);

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{t.dashboard.labels.learningSystem}</p>
      <p className="kairo-muted mt-2 text-xs">Mərhələ tövsiyəsi son sınağın dəqiqliyinə əsaslanır; bütün proqramın mənimsənilməsi demək deyil.</p>
      <div className="mt-4 space-y-3">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`rounded-xl border p-3 ${
              stage.completed
                ? "border-emerald-400/30 bg-emerald-500/10"
                : stage.unlocked
                  ? "border-red-400/30 bg-red-500/10"
                  : "border-white/10 bg-zinc-950"
            }`}
          >
            <p className="font-semibold text-white">{stage.title}</p>
            <p className="mt-1 text-sm text-zinc-300">{stage.description}</p>
            <p className="mt-1 text-xs text-zinc-400">{stage.checkpointMessage}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
