"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
export function AdminLink(){
 const [admin,setAdmin]=useState(false);
 useEffect(()=>{let active=true;const db=getSupabase();async function load(){const {data:{user}}=await db.auth.getUser();if(!user){if(active)setAdmin(false);return;}const {data,error}=await db.rpc("is_admin");if(active)setAdmin(!error&&data===true);}void load().catch(()=>{if(active)setAdmin(false);});const {data:{subscription}}=db.auth.onAuthStateChange(()=>{queueMicrotask(()=>void load().catch(()=>{if(active)setAdmin(false);}));});return()=>{active=false;subscription.unsubscribe();};},[]);
 return admin?<Link href="/admin/overview">Admin mərkəzi ↗</Link>:null;
}
