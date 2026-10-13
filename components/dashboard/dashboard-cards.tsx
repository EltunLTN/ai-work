import type { QuizResult } from "@/lib/types";
import { useLocale } from "@/hooks/use-locale";
import { estimatePerformance } from "@/lib/score-estimate";

export function DashboardCards({ result, completion = 0 }: { result: QuizResult; completion?: number }) {
  const { t } = useLocale();
  const estimate = estimatePerformance(result);

  const items = [
    { label: t.dashboard.labels.currentLevel, value: result.level },
    { label: t.dashboard.labels.predictedScore, value: estimate ? `${estimate.score}/100` : "—" },
    { label: t.dashboard.labels.strongestTopic, value: result.strongestTopic },
    { label: t.dashboard.labels.weakestTopic, value: result.weakestTopic },
    { label: t.dashboard.labels.completion, value: `${completion}%` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{item.label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function RecentActivity({ events = [] }: { events?: Array<{ title: string; date: string }> }) {
  const { t, locale } = useLocale();

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{t.dashboard.labels.recentActivity}</p>
      <ul className="mt-4 space-y-3 text-sm text-zinc-300">
        {!events.length ? <li>{locale === "en" ? "No activity yet." : "Hələ fəaliyyət qeydə alınmayıb."}</li> : null}
        {events.slice(0, 6).map((event) => (
          <li key={`${event.date}:${event.title}`} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-red-400" />
            <span>{event.title}<time dateTime={event.date} className="kairo-muted mt-1 block text-xs">{new Date(event.date).toLocaleString(locale === "az" ? "az-AZ" : "en-GB")}</time></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RecommendedNextStep({ text }: { text: string }) {
  const { t } = useLocale();

  return (
    <div className="rounded-2xl border border-red-400/30 bg-gradient-to-r from-red-500/10 to-zinc-900 p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-red-300">{t.dashboard.labels.recommendedAction}</p>
      <p className="mt-3 text-zinc-100">{text}</p>
    </div>
  );
}
