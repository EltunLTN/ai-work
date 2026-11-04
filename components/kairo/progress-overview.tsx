"use client";
import Link from "next/link";
import { useKairo, dateTime } from "@/lib/kairo/client";
import type { Insights, RankedPlayer } from "@/lib/kairo/insight-types";
import { CompetitionBadges } from "./competition-badges";
import { ModuleStatus } from "./shared";

export function Ranking({rows}:{rows:RankedPlayer[]}) {
 return <div className="module-table-wrap"><table className="module-table"><caption>Ümumi duel reytinqi · başlanğıc 1000 · qələbə +25, məğlubiyyət −10, heç-heçə +3</caption><thead><tr><th>Yer</th><th>İştirakçı</th><th>Reytinq</th><th>Qələbə</th><th>Məğlubiyyət</th><th>Heç-heçə</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.public_id}><td>{i+1}</td><td>{r.nickname}</td><td><strong>{r.rating}</strong></td><td>{r.wins}</td><td>{r.losses}</td><td>{r.draws}</td></tr>)}</tbody></table>{!rows.length&&<p className="data-note">İctimai yarış profili olan iştirakçılar burada görünəcək.</p>}</div>;
}
export function ProgressOverview({data}:{data:Insights}) {
 const d=data.duel_stats, focus=data.focus_week.reduce((n,x)=>n+Number(x.seconds),0);
 return <section className="progress-overview space-y-6">
  <div className="admin-metrics">{[[d.rating,"Duel reytinqi"],[`${d.wins} / ${d.losses}`,"Qələbə / məğlubiyyət"],[Math.floor(focus/60),"Son 28 gün · fokus dəqiqəsi"],[data.tutor.verified,"Yoxlanmış müəllim addımı"]].map(([value,label])=><article key={label}><span>{value}</span><p>{label}</p></article>)}</div>
  <CompetitionBadges items={data.achievements}/>
  <div className="insight-columns"><article className="module-panel"><h2>28 günlük ritmin</h2><p className="data-note">Hər sütun real tamamlanmış sınaqlardakı sual sayını göstərir.</p><div className="rhythm-chart">{data.days.length?data.days.map(day=><div key={day.day} title={`${day.day}: ${day.correct}/${day.total} düzgün`}><i style={{height:`${Math.max(3,Math.min(100,100*day.total/Math.max(...data.days.map(x=>x.total))))}%`}}/><small>{day.day.slice(8)}</small></div>):<p>İlk sınaqdan sonra fəaliyyət qrafikin yaranacaq.</p>}</div></article>
   <article className="module-panel"><h2>Növbəti ən faydalı addım</h2>{data.topics.filter(t=>t.total>0).slice(0,3).map(t=><Link className="next-step-link" key={`${t.subject}:${t.grade}:${t.topic}`} href={`/plan?subject=${encodeURIComponent(t.subject)}&grade=${t.grade}`}><span><strong>{t.topic}</strong><small>{t.subject} · {t.correct}/{t.total} düzgün</small></span><span>Planı aç ↗</span></Link>)}{!data.topics.length&&<p>Əvvəl sınaq işlə. Zəif mövzular nəticəndən hesablanacaq.</p>}</article></div>
  <div className="insight-columns"><article className="module-panel"><h2>Son imtahanlar</h2>{data.exams.slice(0,4).map(e=><Link className="next-step-link" href={`/kairo/exam/session/${e.id}`} key={e.id}><span><strong>{e.name}</strong><small>{dateTime(e.started_at)} · {e.status==="active"?"Davam edir":e.pending?"Yazılı yoxlama gözləyir":"Tamamlandı"}</small></span><span>{e.earned===null?"Davam et":`${e.earned}/${e.maximum}`}</span></Link>)}{!data.exams.length&&<Link href="/kairo/exam">İlk vaxtlı imtahanı başlat ↗</Link>}</article>
  <article className="module-panel"><h2>Son duellər</h2>{data.duels.slice(0,4).map(d=><Link className="next-step-link" href={`/kairo/duel/match/${d.id}`} key={d.id}><span><strong>{d.settings.subject} · {d.opponent?.nickname??"Rəqib gözlənilir"}</strong><small>{d.correct} düzgün · {d.wrong} səhv · {dateTime(d.created_at)}</small></span><span>{d.delta===null?"Davam et":`${d.delta>0?"+":""}${d.delta} xal`}</span></Link>)}{!data.duels.length&&<Link href="/kairo/duel">AI suallı duel yarat ↗</Link>}</article></div>
 </section>;
}
export function UnifiedProgress() {
 const q=useKairo<Insights>("platform.insights.get",{},30000),ranking=useKairo<RankedPlayer[]>("platform.ranking.get",{},60000);
 return <section className="unified-progress"><div className="dashboard-section-title"><div><p className="eyebrow">YENİ / BÜTÜN ÖYRƏNMƏ YOLUN</p><h2>İmtahan, dərs və yarış bir baxışda.</h2></div><Link href="/plan">Adaptiv planı aç ↗</Link></div><ModuleStatus {...q} retry={q.refresh}/>{q.data&&<ProgressOverview data={q.data}/>}<details className="module-panel"><summary>Ümumi reytinqi göstər</summary>{ranking.error?<p role="alert">Reytinq yüklənmədi.</p>:ranking.data?<Ranking rows={ranking.data}/>:<p>Reytinq yüklənir…</p>}</details></section>;
}

export function DuelStanding(){const q=useKairo<Insights>("platform.insights.get",{},30000),ranking=useKairo<RankedPlayer[]>("platform.ranking.get",{},60000);return <section className="module-panel"><h2>Yarış göstəricilərin</h2>{q.data&&<><div className="admin-metrics">{[[q.data.duel_stats.rating,"Reytinq"],[q.data.duel_stats.wins,"Qələbə"],[q.data.duel_stats.losses,"Məğlubiyyət"],[q.data.duel_stats.draws,"Heç-heçə"]].map(([n,l])=><article key={l}><span>{n}</span><p>{l}</p></article>)}</div><CompetitionBadges items={q.data.achievements}/></>}<details><summary>Ümumi reytinq cədvəli</summary>{ranking.data?<Ranking rows={ranking.data}/>:<p>Reytinq yüklənir…</p>}</details></section>;}
