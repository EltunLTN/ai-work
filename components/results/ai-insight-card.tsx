import type { AnalysisResult } from "@/lib/types";

interface AIInsightCardProps {
  analysis: AnalysisResult;
}

export function AIInsightCard({ analysis }: AIInsightCardProps) {
  return (
    <section className="rounded-2xl border border-red-500/40 bg-zinc-950 p-5 shadow-[0_0_30px_rgba(255,45,45,0.16)]">
      <p className="text-xs uppercase tracking-[0.2em] text-red-400">AI Insight</p>
      <p className="mt-3 text-sm text-zinc-200">{analysis.feedback}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Weak Topics</p>
          <p className="mt-2 text-sm text-red-300">{analysis.weakTopics.join(", ") || "No major weakness"}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-zinc-900/70 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Strong Topics</p>
          <p className="mt-2 text-sm text-emerald-300">{analysis.strongTopics.join(", ") || "Building"}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-red-300">Next Step</p>
        <p className="mt-1 text-sm text-zinc-100">{analysis.nextStep}</p>
      </div>
    </section>
  );
}
