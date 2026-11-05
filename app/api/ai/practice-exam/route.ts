import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAIAccess } from "@/lib/ai-access";
import { AI_BUDGET_MESSAGE,isAIBudgetError } from "@/lib/ai/budget";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import { validPracticeSelection,practiceBatches } from "@/lib/kairo/practice-selection";
import { randomInt } from "node:crypto";
export const maxDuration=300;
export async function POST(request:Request){
 const denied = await requireAIAccess(request);
 if (denied) return denied;
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{global:{headers:{Authorization:request.headers.get("authorization")??"","x-kairo-audit":process.env.ACTIVITY_SERVER_SECRET??""}},auth:{persistSession:false,autoRefreshToken:false}});
 const rpc=async(op:string,payload:object)=>{const {data,error}=await db.rpc("learning_api",{operation:op,payload});if(error)throw new Error(error.message);return data;};
 let requestId:string|undefined,lease:string|undefined;
 try{
  const body=await request.json();if(!validPracticeSelection(body.selection)||typeof body.request_id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.request_id))return NextResponse.json({error:"Fənn, sinif və sual sayını yoxla."},{status:400});
  requestId=body.request_id;
  const claim=await rpc("practice.claim",{request_id:requestId,selection:body.selection});
  if(claim.session_id)return NextResponse.json({id:claim.session_id});
  if(!claim.lease)return NextResponse.json({error:"Sınaq artıq hazırlanır. Bir az sonra yenidən cəhd et."},{status:409});
  lease=claim.lease;
  const batches=practiceBatches(body.selection,()=>randomInt(0,1000000)/1000000);
  // Bound concurrency to three generations and settle failures before releasing the lease.
  const results=[];
  for(let i=0;i<batches.length;i+=3){const settled=await Promise.allSettled(batches.slice(i,i+3).map(batch=>generateDiagnosticQuestions({...batch,excludedQuestionStems:claim.recent??[]})));const failure=settled.find(x=>x.status==="rejected");if(failure?.status==="rejected")throw failure.reason;results.push(...settled.flatMap(x=>x.status==="fulfilled"?x.value:[]));}
  const questions=results.map(q=>({subject:q.subject,grade:Number(q.grade),topic:q.topic,difficulty:q.difficulty,type:"single",body:{statement:q.question,options:q.options},answer_key:{answer:q.correctIndex},explanation:q.explanation,points:1}));
  const result=await rpc("practice.save",{request_id:requestId,lease,questions});
  return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){if(lease)await rpc("practice.fail",{request_id:requestId,lease}).catch(()=>{});return NextResponse.json({error:isAIBudgetError(error)?AI_BUDGET_MESSAGE:error instanceof Error?error.message:"Sınaq hazırlanmadı."},{status:503,headers:{"Cache-Control":"no-store"}});}
}

