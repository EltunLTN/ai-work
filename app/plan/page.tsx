import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { KairoAccountBoundary } from "@/components/kairo/shared";
import { AdaptivePlan } from "@/components/kairo/adaptive-plan";
import { ExamPlanWorkspace } from "@/components/kairo/exam-plan-workspace";
import { Notice } from "@/components/kairo/shared";
import Link from "next/link";
export default async function PlanPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,exam=typeof params.exam==="string"?params.exam:"",subject=typeof params.subject==="string"?params.subject:"";
 const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam);
 return <div className="kairo-page"><Navbar/><main id="main-content" className="kairo-module-main"><KairoAccountBoundary>{params.exam!==undefined?(valid?<ExamPlanWorkspace key={`${exam}:${subject}`} id={exam} subject={subject} create={params.create==="1"}/>:<><Notice error>Sınaq keçidi uyğun deyil.</Notice><Link className="module-button" href="/plan">Bütün planlarım ↗</Link></>):<AdaptivePlan key={`${subject}:${String(params.grade??"")}`}/>}</KairoAccountBoundary></main><Footer/></div>;
}
