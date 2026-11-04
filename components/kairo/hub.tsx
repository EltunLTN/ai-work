"use client";
import Link from "next/link";
import { KAIRO_ROUTES, useKairo, dateTime } from "@/lib/kairo/client";
import { ModuleHeading, ModuleIcon, ModuleStatus } from "./shared";
interface Home {
  goal: { university: string; program: string; target: number } | null;
  focus_today: number;
  next_tournament: { id: string; name: string; starts_at: string } | null;
  last_exam: {
    id: string;
    name: string;
    status: string;
    earned: number | null;
    maximum: number | null;
  } | null;
  tutor: { id: string; topic: string } | null;
  duel: { id: string; status: string } | null;
}
const descriptions = [
  "Vaxtlı imtahan, saxlanmış cavablar, ətraflı nəticə.",
  "İpucu ilə düşün, addım-addım həll et.",
  "Mənbəli ixtisas kataloqu və şəxsi hədəflər.",
  "Diqqətini topla, real iş vaxtını izlə.",
  "Dostunla eyni suallarda üz-üzə gəl.",
  "Həftəlik sınaq və canlı pley-off yarışları.",
  "Qrafik, həndəsə və fizika təcrübələri.",
  "İmtahanını təkrar izlə, səhvlərindən öyrən.",
];
export function KairoHub({ widget = false }: { widget?: boolean }) {
  const q = useKairo<Home>("home.get");
  const notes = q.data
    ? [
        q.data.last_exam
          ? `${q.data.last_exam.name} · ${q.data.last_exam.earned ?? "Davam edir"}${q.data.last_exam.maximum ? `/${q.data.last_exam.maximum}` : ""}`
          : "İlk imtahanını başlat",
        q.data.tutor?.topic ?? "Yeni dərsə başla",
        q.data.goal
          ? `${q.data.goal.university} · hədəf ${q.data.goal.target}`
          : "Universitet hədəfini seç",
        `Bu gün ${Math.floor(q.data.focus_today / 60)} dəqiqə`,
        q.data.duel ? "Aktiv duelə qayıt" : "Qarşılaşma yarat",
        q.data.next_tournament
          ? `${q.data.next_tournament.name} · ${dateTime(q.data.next_tournament.starts_at)}`
          : "Yarış təqviminə bax",
      ]
    : [];
  const hrefs = q.data
    ? [
        q.data.last_exam ? `/kairo/exam/session/${q.data.last_exam.id}` : null,
        q.data.tutor ? `/kairo/tutor?session=${q.data.tutor.id}` : null,
        null,
        null,
        q.data.duel ? `/kairo/duel/match/${q.data.duel.id}` : null,
        q.data.next_tournament
          ? `/kairo/arena/${q.data.next_tournament.id}`
          : null,
      ]
    : [];
  return (
    <section className={widget ? "kairo-hub-widget" : "kairo-hub"}>
      {widget ? (
        <div className="hub-widget-heading">
          <h2>Öyrənmə alətlərin</h2>
          <Link href="/kairo">Hamısına bax ↗</Link>
        </div>
      ) : (
        <ModuleHeading
          eyebrow="Kairo / öyrənmə sistemi"
          title="Öyrən. Sına. İrəlilə."
          description="Hazırlığın bir yerdə: müstəqil nəticələr, yönləndirici müəllim, aydın hədəflər və real yarışlar."
        />
      )}
      {!widget && <ModuleStatus {...q} retry={q.refresh} />}
      <div className="module-grid hub-grid">
        {KAIRO_ROUTES.map((r, i) => (
          <Link
            className="module-card hub-card"
            key={r.href}
            href={hrefs[i] ?? r.href}
          >
            <div className="hub-card-top">
              <ModuleIcon name={r.icon} />
              <span>0{i + 1} ↗</span>
            </div>
            <h3>{r.label}</h3>
            {!widget && <p>{descriptions[i]}</p>}
            <small>{notes[i] ?? "Hesabınla davam et"}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}

