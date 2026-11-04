import { NextResponse } from "next/server";
import { requireAIAccess } from "@/lib/ai-access";
import { isAIBudgetError, AI_BUDGET_MESSAGE } from "@/lib/ai/budget";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import { platformServer } from "@/lib/kairo/server";
import { getTextbooksBySelection,isSupportedSelection } from "@/lib/textbook-reference";
import type { Grade,Subject } from "@/lib/types";
export const maxDuration=300;
export async function POST(request:Request){
 const denied = await requireAIAccess(request);
 if (denied) return denied;
 const rpc=platformServer(request);let claimPayload:object|undefined;let ownsLease=false;
 try{
  const body=await request.json(),s=body.settings;
  const grade=String(s?.grade) as Grade,subject=s?.subject as Subject;
  if(!s||!isSupportedSelection(grade,subject)||typeof body.request_id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.request_id)||![5,10,15,20].includes(s.count))return NextResponse.json({error:"Duel seçimi uyğun deyil."},{status:400});
  const payload={settings:s,request_id:body.request_id,find:body.find===true};
  const topics=[...new Set(getTextbooksBySelection(grade,subject).flatMap(t=>t.topics))];
  if(s.topic&&!topics.includes(s.topic))return NextResponse.json({error:"Mövzu seçilmiş sinfə uyğun deyil."},{status:400});
  claimPayload=payload;
  const claimed=await rpc<{generate?:boolean;excluded?:string[];id?:string}>("duel.ai.claim",payload);
  if(!claimed.generate)return NextResponse.json(claimed,{headers:{"Cache-Control":"no-store"}});
  ownsLease=true;
  const selected=s.topic?[s.topic]:topics.toSorted(()=>Math.random()-.5).slice(0,Math.min(3,s.count));
  const generated=await generateDiagnosticQuestions({grade,subject,topics:selected,count:s.count,level:s.difficulty==="easy"?"beginner":s.difficulty==="hard"?"advanced":"intermediate",difficulty:s.difficulty==="mixed"?undefined:s.difficulty,excludedQuestionStems:claimed.excluded??[]});
  const questions=generated.map(q=>({subject:q.subject,grade:Number(q.grade),topic:q.topic,difficulty:q.difficulty,type:"single",body:{statement:q.question,options:q.options},answer_key:{answer:q.correctIndex},explanation:q.explanation,points:1,origin:"ai",status:"draft"}));
  const result=await rpc("duel.ai.save",{...payload,questions});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){if(ownsLease&&claimPayload)await rpc("duel.ai.fail",claimPayload).catch(()=>{});return NextResponse.json({error:isAIBudgetError(error)?AI_BUDGET_MESSAGE:error instanceof Error?error.message:"Duel sualları hazırlanmadı."},{status:error instanceof SyntaxError?400:503,headers:{"Cache-Control":"no-store"}});}
}
