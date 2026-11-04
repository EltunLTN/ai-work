"use client";
import Link from "next/link";
import { useEffect,useRef,useState } from "react";
import { kairo,useKairo } from "@/lib/kairo/client";
import { aiFetch } from "@/lib/supabase/client";
import { getStudentProfile,STORAGE_CHANGE_EVENT } from "@/lib/storage";
import { getSubjects,getTextbooksBySelection } from "@/lib/textbook-reference";
import { calendarDay,planEvidence,planTaskCompletion,taskKey } from "@/lib/kairo/plan-evidence";
import type { Grade,Subject } from "@/lib/types";
import type { PlanState } from "@/lib/kairo/insight-types";
import { LearningResourceCards } from "@/components/ai/learning-resource-cards";
import { ModuleHeading,ModuleStatus,Notice } from "./shared";
export function AdaptivePlan(){
 const [subject,setSubject]=useState<Subject>("Riyaziyyat"),[grade,setGrade]=useState<Grade>("11"),[initialized,setInitialized]=useState(false);
 useEffect(()=>{const p=new URLSearchParams(location.search),profile=getStudentProfile();const s=p.get("subject")??profile?.subject??"Riyaziyyat",g=p.get("grade")??profile?.grade??"11";queueMicrotask(()=>{if(getSubjects().includes(s as Subject))setSubject(s as Subject);if(/^(?:[1-9]|10|11)$/.test(g))setGrade(g as Grade);setInitialized(true);});},[]);
 return <><ModuleHeading eyebrow="PLAN / CANLI ÖYRƏNMƏ YOLUN" title="Hər nəticə, yeni bir addım." description="Dərs, məşq və yoxlama bir zaman xəttində. Yeni nəticələrinə uyğunlaşan plan."/><div className="plan-selection module-form-row"><label>Fənn<select className="account-field" value={subject} onChange={e=>setSubject(e.target.value as Subject)}>{getSubjects().map(s=><option key={s}>{s}</option>)}</select></label><label>Sinif<select className="account-field" value={grade} onChange={e=>setGrade(e.target.value as Grade)}>{Array.from({length:11},(_,i)=><option key={i+1} value={i+1}>{i+1}-ci sinif</option>)}</select></label></div>{initialized&&<PlanJourney key={`${subject}:${grade}`} subject={subject} grade={grade}/>}</>;
}
function PlanJourney({subject,grade}:{subject:Subject;grade:Grade}){
 const selection={subject,grade:Number(grade)},q=useKairo<PlanState>("platform.plan.get",selection,20000);
 const [day,setDay]=useState(1),[minutes,setMinutes]=useState(45),[busy,setBusy]=useState(false),[message,setMessage]=useState(""),[taskBusy,setTaskBusy]=useState(false);
 const auto=useRef(""),running=useRef(false),initial=useRef(false);
 const topics=[...new Set(getTextbooksBySelection(grade,subject).flatMap(t=>t.topics))];
 const evidence=planEvidence(q.data?.context.attempts??[],topics),saved=q.data?.saved,plan=saved?.plan;
 async function generate(force=false){
  if(running.current)return;running.current=true;setBusy(true);setMessage("");
  try{const r=await aiFetch("/api/ai/adaptive-plan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...selection,dailyMinutes:minutes,force})});const data=await r.json();if(!r.ok)throw new Error(data.error??"Plan yenilənmədi.");q.setData(data);setMessage("Plan son nəticələrinə uyğun saxlanıldı.");}
  catch(e){setMessage(e instanceof Error?e.message:"Plan yenilənmədi.");}finally{running.current=false;setBusy(false);}
 }
 const refresh=q.refresh;
 useEffect(()=>{const update=()=>refresh();window.addEventListener(STORAGE_CHANGE_EVENT,update);return()=>window.removeEventListener(STORAGE_CHANGE_EVENT,update);},[refresh]);
 useEffect(()=>{if(!q.data)return;const fingerprint=`${q.data.context.version}:${minutes}`;if(!initial.current){initial.current=true;if(q.data.saved&&q.data.saved.daily_minutes!==minutes){queueMicrotask(()=>setMinutes(q.data!.saved!.daily_minutes));return;}}
 if(!running.current&&evidence.total&&(!q.data.saved?.plan||q.data.saved.source_version!==q.data.context.version||q.data.saved.daily_minutes!==minutes)&&auto.current!==fingerprint){auto.current=fingerprint;queueMicrotask(()=>void generate());}
 // Generate once per persisted evidence version, never for every poll.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[q.data?.context.version,q.data?.saved?.source_version,minutes,evidence.total,busy]);
 async function toggle(key:string,done:boolean){setTaskBusy(true);try{q.setData(await kairo<PlanState>("platform.plan.task",{...selection,key,done}));}catch(e){setMessage((e as Error).message);}finally{setTaskBusy(false);}}
 const active=plan?.days.find(d=>d.day===day)??plan?.days[0],completion=plan?planTaskCompletion(plan.days,saved?.completed??{}):0;
 const start=plan?.generatedAt??saved?.updated_at??"1970-01-01T00:00:00Z";
 function exportCalendar(){if(!plan)return;const escape=(s:string)=>s.replaceAll("\\","\\\\").replaceAll(";","\\;").replaceAll(",","\\,").replace(/\r?\n/g,"\\n");const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Kairo//AZ",...plan.days.flatMap(d=>["BEGIN:VEVENT",`UID:kairo-${saved?.source_version}-${d.day}-${encodeURIComponent(subject)}@eltun.dev`,`DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g,"")}`,`DTSTART;VALUE=DATE:${calendarDay(start,d.day).replaceAll("-","")}`,`SUMMARY:${escape(`${subject}: ${d.topic}`)}`,`DESCRIPTION:${escape(`${d.estimatedMinutes} dəqiqə. ${d.tasks.join("; ")}`)}`,"END:VEVENT"]),"END:VCALENDAR"];const url=URL.createObjectURL(new Blob([lines.join("\r\n")],{type:"text/calendar;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="kairo-tehsil-plani.ics";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return <section className="adaptive-plan"><ModuleStatus {...q} retry={q.refresh}/><div className="module-actions"><label>Gündəlik vaxt<select className="account-field" disabled={busy} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>{[30,45,60,90].map(m=><option key={m} value={m}>{m} dəqiqə</option>)}</select></label><button className="module-button" disabled={busy||!evidence.total} onClick={()=>void generate(true)}>{busy?"Plan uyğunlaşdırılır…":"Planı yenilə"}</button>{plan&&<button className="module-button" onClick={exportCalendar}>Təqvimə əlavə et ↓</button>}</div>{message&&<Notice>{message}</Notice>}
 {q.data&&!evidence.total&&<div className="module-panel plan-empty"><h2>Bu fənn üçün ilk addımını ölçək.</h2><p>Fərdi plan üçün {grade}-ci sinif, {subject} üzrə müstəqil sınaq tamamla. Zəif mövzu və bilik faizi real nəticədən hesablanır.</p><Link className="module-button primary" href="/onboarding">Sınağa başla ↗</Link><Link className="module-button" href="/kairo/exam">Vaxtlı imtahan ↗</Link></div>}
 {busy&&!plan&&<p role="status" className="module-panel">Yeddi günlük dərs və yoxlama yolu hazırlanır…</p>}
 {plan&&active&&<><div className="plan-hero"><div><p className="eyebrow">{subject} / {grade}-Cİ SİNİF</p><h2>{plan.title}</h2><p>{plan.summary}</p>{saved?.source_version!==q.data?.context.version&&<p role="status">Yeni nəticə var. Plan uyğunlaşdırılır; əvvəlki tapşırıqların saxlanılır.</p>}</div><div className="plan-measures"><div><strong>{completion}%</strong><span>Tapşırıq tamamlanması</span><progress value={completion} max={100}/></div><div><strong>{evidence.accuracy===null?"—":`${evidence.accuracy}%`}</strong><span>Son müstəqil nəticələr · {evidence.correct}/{evidence.total}</span><small>Tapşırığı işarələmək bilik faizini dəyişmir.</small></div></div></div>
 <div className="plan-journey-grid"><aside className="plan-timeline" aria-label="Yeddi günlük zaman xətti">{plan.days.map(d=>{const count=d.tasks.filter(t=>saved?.completed[taskKey(d.topic??"",t,d.day)]).length;return <button key={d.day} aria-pressed={d.day===active.day} className={d.day===active.day?"selected":""} onClick={()=>setDay(d.day)}><span className="timeline-node">{count===d.tasks.length?"✓":String(d.day).padStart(2,"0")}</span><span><small>{calendarDay(start,d.day)} · {d.estimatedMinutes} dəq</small><strong>{d.focus}</strong><em>{count}/{d.tasks.length} tapşırıq {d.checkpoint?"· Yoxlama":""}</em></span></button>;})}</aside>
 <section className="plan-day-content"><header><p className="eyebrow">{active.day}-Cİ GÜN / {calendarDay(start,active.day)}</p><h2>{active.topic}</h2><p>{active.focus}</p></header><div className="lesson-path"><Link href={`/kairo/tutor?subject=${encodeURIComponent(subject)}&grade=${grade}&topic=${encodeURIComponent(active.topic??"")}`}><small>01 / ÖYRƏN</small><strong>Müəllimlə mövzunu anla ↗</strong></Link><Link href={`/mini-quiz?topic=${encodeURIComponent(active.topic??"")}&subject=${encodeURIComponent(subject)}&grade=${grade}`}><small>02 / TƏTBİQ ET</small><strong>Mövzu üzrə mini-test ↗</strong></Link><Link href={`/kairo/focus?subject=${encodeURIComponent(subject)}&task=${encodeURIComponent(active.topic??"")}&return_path=/plan`}><small>03 / FOKUS</small><strong>Diqqətini topla ↗</strong></Link></div>
 <section className="module-panel"><h3>Bugünkü tapşırıqlar</h3>{active.tasks.map(task=>{const key=taskKey(active.topic??"",task,active.day),done=saved?.completed[key]===true;return <label className="plan-task" key={task}><input type="checkbox" checked={done} disabled={taskBusy} onChange={e=>void toggle(key,e.target.checked)}/><span className={done?"done":""}>{task}</span></label>;})}</section>
 {active.checkpoint&&<aside className="plan-checkpoint"><strong>Bilik yoxlaması günü</strong><p>Mövzu testini tamamla. Yalnız yeni sınaq nəticəsi bilik göstəricini dəyişir; nəticə bazaya yazıldıqda plan uyğunlaşır.</p></aside>}
 <section><h3>Mövzuya uyğun dərs resursları</h3><LearningResourceCards resources={active.resources??[]}/></section></section></div>
 <details className="module-panel"><summary>Bu plan niyə seçilib?</summary><p>Son 10 müstəqil sınağın nəticələri. 70%-dən aşağı mövzulara üstünlük verilir. Duel və köməkli həll bilik faizinə qatılmır.</p>{evidence.topics.map(t=><p key={t.topic}>{t.topic} · {t.correct}/{t.total} düzgün · {t.accuracy}%</p>)}</details></>}
 </section>;
}
