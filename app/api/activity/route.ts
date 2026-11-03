import { createClient } from "@supabase/supabase-js";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { sanitizeActivity } from "@/lib/activity-validation";
export async function POST(request: Request) {
  const reply = (body: object, status: number) => NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return reply({error:"Daxil olun."},401);
  if (Number(request.headers.get("content-length") ?? 0)>12000) return reply({error:"Sorğu böyükdür."},413);
  const secret=process.env.ACTIVITY_SERVER_SECRET, url=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!secret || !url || !key) return reply({error:"Jurnal xidməti hazır deyil."},503);
  try {
    const text=await request.text(); if (text.length>12000) return reply({error:"Sorğu böyükdür."},413);
    let events; try { events=sanitizeActivity(JSON.parse(text).events); } catch { return reply({error:"Uyğun olmayan hadisə."},400); }
    const db=createClient(url,key,{global:{headers:{Authorization:authorization,"x-kairo-audit":secret}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error}=await db.auth.getUser(authorization.slice(7)); if (error || !user) return reply({error:"Daxil olun."},401);
    // Vercel overwrites this header at its edge; do not trust arbitrary X-Forwarded-For or a client body IP.
    const rawIp=process.env.VERCEL ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() : null;
    const ip=rawIp && isIP(rawIp) ? rawIp : null;
    const {data,error:writeError}=await db.rpc("record_activity",{events,client_ip:ip,agent:(request.headers.get("user-agent") ?? "").slice(0,300)});
    if(writeError) return reply({error:"Jurnal yazılmadı."},503);
    return reply({accepted:data},202);
  } catch { return reply({error:"Jurnal xidməti ilə əlaqə alınmadı."},503); }
}
