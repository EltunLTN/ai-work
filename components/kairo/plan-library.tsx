"use client";
import Link from "next/link";
import {useState} from "react";
import {dateTime,useKairo} from "@/lib/kairo/client";
import type {Grade,Subject} from "@/lib/types";
import {getSubjects} from "@/lib/textbook-reference";
import {ModuleStatus} from "./shared";
import {ExamStudyPlan} from "./exam-study-plan";
interface Library {plans:Array<{subject:Subject;grade:Grade;attempts:number;total:number;correct:number;last_result:string|null;has_plan:boolean;title:string|null;updated_at:string|null}>;exam_plans:Array<{session_id:string;subject:Subject;grade:number;title:string;created_at:string}>}
export function PlanLibrary({onSelect}:{onSelect:(subject:Subject,grade:Grade)=>void}){
 const q=useKairo<Library>("learning.plans.list",{},30000),[filter,setFilter]=useState(""),[archive,setArchive]=useState<Library["exam_plans"][number]|null>(null);
 return <section className="module-panel plan-library"><div className="module-panel-heading"><div><p className="eyebrow">PLAN KİTABXANAN</p><h2>Bütün fənnlər. Bütün siniflər.</h2></div><label>Fənn süzgəci<select className="account-field" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Hamısı</option>{getSubjects().map(s=><option key={s}>{s}</option>)}</select></label></div><ModuleStatus {...q} retry={q.refresh}/>{q.data&&<><div className="plan-library-grid">{q.data.plans.filter(p=>!filter||p.subject===filter).map(p=><article key={`${p.subject}:${p.grade}`}><p className="eyebrow">{p.subject} · {p.grade}-ci sinif</p><h3>{p.title??"Nəticələrindən plan qur"}</h3><p>{p.attempts} nəticə · {p.correct}/{p.total} düzgün</p><small>{p.updated_at?`Plan: ${dateTime(p.updated_at)}`:p.last_result?`Son nəticə: ${dateTime(p.last_result)}`:"Hələ nəticə yoxdur"}</small><button className="module-button" onClick={()=>{setArchive(null);onSelect(p.subject,p.grade);}}>{p.has_plan?"Planı aç ↓":"Bu seçimə plan yarat ↓"}</button><Link href={`/onboarding?${new URLSearchParams({subject:p.subject,grade:p.grade})}`}>Bu fənn və sinifdə sınaq ↗</Link></article>)}</div>{!q.data.plans.length&&<p>İlk sınaqdan sonra hər fənn və sinfin planı burada ayrı görünəcək.</p>}<details className="module-panel"><summary>İmtahanlara bağlı saxlanmış planlar ({q.data.exam_plans.length})</summary>{q.data.exam_plans.filter(p=>!filter||p.subject===filter).map(p=><button className="next-step-link w-full" key={`${p.session_id}:${p.subject}`} onClick={()=>setArchive(p)}><span><strong>{p.subject} · {p.grade}-ci sinif · {p.title}</strong><small>{dateTime(p.created_at)}</small></span><span>Aç ↓</span></button>)}</details>{archive&&<ExamStudyPlan key={`${archive.session_id}:${archive.subject}`} id={archive.session_id} subjects={[archive.subject]} grade={archive.grade}/>}</>}</section>;
}

