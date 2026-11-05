"use client";
import Link from "next/link";
import {useState} from "react";

/** Exam review only offers navigation; fetching and generation belong to /plan. */
export function ExamPlanAction({id,subjects,grade}:{id:string;subjects:string[];grade:number}){
 const choices=[...new Set(subjects)], [subject,setSubject]=useState(choices[0]??"");
 if(!choices.length)return null;
 return <section className="module-panel"><div className="admin-toolbar"><h2>Növbəti addım: fərdi planın</h2><label>Planın fənni<select className="account-field" value={subject} onChange={e=>setSubject(e.target.value)}>{choices.map(s=><option key={s}>{s}</option>)}</select></label></div><p>Bu nəticəyə əsaslanan 7 günlük planı Plan bölməsində hazırla və oradan davam et.</p><Link className="module-button primary" href={`/plan?${new URLSearchParams({exam:id,subject,grade:String(grade),create:"1"})}`}>Plan bölməsində yarat ↗</Link></section>;
}
