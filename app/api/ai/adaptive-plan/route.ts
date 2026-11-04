import { NextResponse } from "next/server";
import { requireAIAccess } from "@/lib/ai-access";
import { isAIBudgetError, AI_BUDGET_MESSAGE } from "@/lib/ai/budget";
import { generateStudyPlan } from "@/lib/ai/client";
import { platformServer } from "@/lib/kairo/server";
import { planEvidence } from "@/lib/kairo/plan-evidence";
import { getTextbooksBySelection, isSupportedSelection } from "@/lib/textbook-reference";
import type { Grade, Subject } from "@/lib/types";
import type { PlanState } from "@/lib/kairo/insight-types";
export const maxDuration=300;
export async function POST(request:Request) {
 const denied = await requireAIAccess(request);
 if (denied) return denied;
 const rpc=platformServer(request); let lease:string|undefined;let selection:Record<string,unknown>={};
 try {
  const body=await request.json();const grade=String(body.grade) as Grade,subject=body.subject as Subject;
  if(!isSupportedSelection(grade,subject)||![30,45,60,90].includes(body.dailyMinutes))return NextResponse.json({error:"Sinif, fənn və gündəlik vaxt seç."},{status:400});
  selection={subject,grade:Number(grade)};
  const state=await rpc<PlanState>("plan.get",selection);
  if(state.saved?.plan&&state.saved.source_version===state.context.version&&state.saved.daily_minutes===body.dailyMinutes&&!body.force)return NextResponse.json(state,{headers:{"Cache-Control":"no-store"}});
  const topics=[...new Set(getTextbooksBySelection(grade,subject).flatMap(t=>t.topics))];
  const evidence=planEvidence(state.context.attempts,topics);
  if(!evidence.total)return NextResponse.json({error:"Bu sinif və fənn üzrə əvvəlcə mövzuları olan sınaq tamamla."},{status:400});
  const claim=await rpc<{claimed:boolean;lease?:string}>("plan.claim",{...selection,version:state.context.version});
  if(!claim.claimed||!claim.lease)return NextResponse.json({error:"Plan artıq yenilənir. Bir az sonra yenilə."},{status:409});
  lease=claim.lease;
  const plan=await generateStudyPlan({grade,subject,weakTopics:evidence.weakTopics,level:evidence.accuracy!<45?"beginner":evidence.accuracy!<80?"intermediate":"advanced",targetImprovement:"Son 10 müstəqil nəticədəki zəif mövzulara uyğun növbəti addımlar",curriculumTopics:topics,topicScores:evidence.topics,errorPatterns:evidence.topics.filter(t=>t.accuracy<70).map(t=>`${t.topic}: ${t.correct}/${t.total}`),dailyMinutes:body.dailyMinutes,resultSubmittedAt:evidence.latest});
  return NextResponse.json(await rpc("plan.save",{...selection,lease,version:state.context.version,dailyMinutes:body.dailyMinutes,plan}),{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(lease)await rpc("plan.fail",{...selection,lease}).catch(()=>{});
  return NextResponse.json({error:isAIBudgetError(error)?AI_BUDGET_MESSAGE:error instanceof Error?error.message:"Plan hazırlanmadı."},{status:error instanceof SyntaxError?400:503,headers:{"Cache-Control":"no-store"}});
 }
}
