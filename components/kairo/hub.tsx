"use client";
import Link from "next/link";
import {useState} from "react";
import {FeatureCard} from "./feature-card";
import type {FocusState} from "@/lib/kairo/types";
import {useNow,clock} from "@/lib/kairo/client";
import { KAIRO_ROUTES, useKairo, dateTime } from "@/lib/kairo/client";
import { ModuleHeading, ModuleStatus } from "./shared";
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
  "İxtisasları müqayisə et, gələcək ünvanını seç.",
  "Diqqətini topla, real iş vaxtını izlə.",
  "Dostunla eyni suallarda üz-üzə gəl.",
  "Həftəlik sınaq və canlı pley-off yarışları.",
  "Qrafik, həndəsə və fizika təcrübələri.",
  "İmtahanını təkrar izlə, səhvlərindən öyrən.",
];
export function KairoHub({ widget = false }: { widget?: boolean }) {
  const q = useKairo<Home>("home.get");
  const focus = useKairo<FocusState>("focus.get",{},30000);
  const reviews=useKairo<{exams:Array<{id:string;name:string}>}>("learning.mistakes.get");
  const lastReview=reviews.data?.exams[0];
  const notes = q.data
    ? [
        q.data.last_exam
          ? `${q.data.last_exam.name} · ${q.data.last_exam.status === "active" ? "Davam edir" : q.data.last_exam.status === "abandoned" ? "Dayandırılıb" : q.data.last_exam.earned !== null ? `${q.data.last_exam.earned}/${q.data.last_exam.maximum}` : "Yoxlama gözləyir"}`
          : "İlk imtahanını başlat",
        q.data.tutor?.topic ?? "Yeni dərsə başla",
        q.data.goal
          ? `${q.data.goal.university} · hədəf ${q.data.goal.target}`
          : "Universitet hədəfini seç",
        focus.data?.active ? (focus.data.active.status === "paused" ? "Fokus fasiləyə qoyulub" : `Aktiv fokus · ${focus.data.active.subject}`) : `Bu gün ${Math.floor(q.data.focus_today / 60)} dəqiqə`,
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
      {!widget && q.status!=="guest" && <ModuleStatus {...q} retry={q.refresh} />}
      <div className="premium-feature-grid">
        {KAIRO_ROUTES.map((r, i) => (
          i===3&&focus.data?.active?<LiveFocusCard key={`${r.href}:${focus.data.server_now}`} data={focus.data} index={i} title={r.label} icon={r.icon} href={hrefs[i]??r.href} description={descriptions[i]} note={notes[i]??"Fokus rejimini aç"}/>:<FeatureCard key={r.href} href={hrefs[i]??r.href} title={r.label} icon={r.icon} index={i} description={descriptions[i]} note={i===7?(lastReview?.name??"İlk sınağından sonra səhvlərini burada araşdır"):i===6?"17 interaktiv təcrübə · 5 istiqamət":notes[i]??["İlk imtahanını başlat","Yeni dərsə başla","Universitet hədəfini seç","Öz ritmini tap","Qarşılaşma yarat","Yarış təqviminə bax"][i]??"Laboratoriyanı kəşf et"} cta={["Sınağı aç","Dərsə keç","Hədəflərim","Diqqətini topla","Duelə keç","Arenaya bax","Təcrübə et","Təhlilə keç"][i]} target={q.data?.goal?.target}/>
        ))}
      </div>
    </section>
  );
}

function LiveFocusCard({data,...props}:{data:FocusState}&Omit<Parameters<typeof FeatureCard>[0],"cta">){const now=useNow(),[received]=useState(()=>Date.now()),s=data.active!;const remaining=s.status==="active"?Math.max(0,Math.min(s.phase_seconds,(Date.parse(s.deadline)-Date.parse(data.server_now)-(now-received))/1000)):Math.max(0,s.phase_seconds-s.phase_credited);return <FeatureCard {...props} cta="Fokusa qayıt" focusLabel={clock(remaining)} focusProgress={Math.max(0,Math.min(100,(1-remaining/s.phase_seconds)*100))}/>;}

