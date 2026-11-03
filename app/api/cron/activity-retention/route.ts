import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"Unauthorized"},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,secret=process.env.ACTIVITY_SERVER_SECRET;
  if(!url||!key||!secret) return NextResponse.json({error:"Not configured"},{status:503});
  const db=createClient(url,key,{global:{headers:{"x-kairo-audit":secret}},auth:{persistSession:false}});
  const {data,error}=await db.rpc("prune_activity");
  return NextResponse.json(error?{error:"Retention failed"}:{removed:data},{status:error?503:200});
}
