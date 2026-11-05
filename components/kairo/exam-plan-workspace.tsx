"use client";
import Link from "next/link";
import {useKairo,dateTime} from "@/lib/kairo/client";
import type {ExamState} from "@/lib/kairo/types";
import {ExamStudyPlan} from "./exam-study-plan";
import {ModuleHeading,ModuleStatus,Notice} from "./shared";

export function ExamPlanWorkspace({id,subject,create}:{id:string;subject:string;create:boolean}){
 const q=useKairo<ExamState>("exam.get",{id}),exam=q.data;
 const subjects=[...new Set(exam?.result?.subjects.map(s=>s.subject)??[])];
 const selected=subjects.includes(subject)?subject:subjects[0];
 const eligible=exam?.status==="finalized"&&exam.mode==="exam"&&exam.template.practice_mode!=="mixed"&&exam.can_reveal&&!!selected;
 return <><ModuleHeading eyebrow="PLAN / SINAQ NƏTİCƏSİNDƏN" title="Nəticəndən növbəti addıma." description="Bu sınağın nəticəsinə uyğun plan burada hazırlanır və hesabında saxlanır."/><ModuleStatus {...q} retry={q.refresh}/>{exam&&<><section className="module-panel"><p className="eyebrow">PLANIN ƏSASLANDIĞI SINAQ</p><h2>{exam.template.name}</h2><p>{dateTime(exam.submitted_at??exam.started_at)} · {exam.template.grade}-ci sinif{exam.result?` · ${exam.result.correct}/${exam.result.total} düzgün`:""}</p><div className="module-actions"><Link className="module-button" href={`/kairo/exam/session/${exam.id}`}>Sınaq nəticəsinə qayıt ↗</Link><Link className="module-button" href={`/plan?${new URLSearchParams({subject:selected??"Riyaziyyat",grade:String(exam.template.grade)})}`}>Bütün planlarım ↗</Link></div></section>{eligible?<ExamStudyPlan key={`${id}:${selected}`} id={id} subjects={subjects} initialSubject={selected} grade={exam.template.grade} autoGenerate={create}/>:<Notice>Bu sınaq üçün plan hələ açıla bilmir. Yekunlaşdırılmış, bir sinif üzrə şəxsi sınaq seç.</Notice>}</>}</>;
}
