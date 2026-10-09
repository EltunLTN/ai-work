import type { DiagnosticResult, FeedbackSummary, StudyPlan } from "@/lib/types";

export function LevelBadge({ level }: { level: DiagnosticResult["level"] }) {
  const color = level === "advanced" ? "bg-emerald-500/20 text-emerald-300" : level === "intermediate" ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300";

  return <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.2em] ${color}`}>{level}</span>;
}

export function ResultsSummary({ result }: { result: DiagnosticResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Stat title="Ümumi score" value={`${result.overallAccuracy}%`} />
      <Stat title="Səviyyə" value={result.level} />
      <Stat title="Güclü mövzu" value={result.strongestTopic} />
      <Stat title="Zəif mövzu" value={result.weakestTopic} />
    </div>
  );
}

export function WeaknessCard({ result }: { result: DiagnosticResult }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Zəiflik analizi</p>
      <p className="mt-3 text-zinc-300">Prioritet mövzular: {result.weakTopics.join(", ") || "Sabit performans"}</p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-400">
        {result.errorPatterns.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendationCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-red-400/30 bg-gradient-to-r from-red-500/10 to-transparent p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-red-300">Tövsiyə olunan növbəti addım</p>
      <p className="mt-2">{text}</p>
    </div>
  );
}

export function FeedbackBox({ feedback }: { feedback: FeedbackSummary }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <h3 className="text-xl font-semibold text-white">{feedback.headline}</h3>
      <p className="mt-2 text-zinc-300">{feedback.summary}</p>
      <p className="mt-3 text-sm text-red-300">{feedback.nextStep}</p>
    </div>
  );
}

export function StudyPlanTimeline({ plan }: { plan: StudyPlan }) {
  return (
    <div className="space-y-3">
      {plan.days.map((day) => (
        <div key={day.day} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-red-300">Gün {day.day}</p>
          <h4 className="mt-1 text-lg font-semibold text-white">{day.focus}</h4>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-300">
            {day.tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-zinc-500">Təxmini {day.estimatedMinutes} dəqiqə</p>
        </div>
      ))}
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
