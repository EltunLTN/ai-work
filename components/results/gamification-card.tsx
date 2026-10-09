import type { GamificationState } from "@/lib/types";

interface GamificationCardProps {
  state: GamificationState;
}

export function GamificationCard({ state }: GamificationCardProps) {
  const levelProgress = state.xp % 100;

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Gamification</p>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-zinc-400">XP</p>
          <p className="mt-1 text-lg font-bold text-red-300">{state.xp}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-zinc-400">Streak</p>
          <p className="mt-1 text-lg font-bold text-amber-300">{state.streak} days</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-zinc-400">Level</p>
          <p className="mt-1 text-lg font-bold text-emerald-300">Lv.{state.level}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
          <span>Level progress</span>
          <span>{levelProgress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-red-400" style={{ width: `${levelProgress}%` }} />
        </div>
      </div>
    </section>
  );
}
