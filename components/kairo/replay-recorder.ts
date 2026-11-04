"use client";
import { useCallback,useEffect,useRef } from "react";
import { kairo } from "@/lib/kairo/client";
type Event={id:string;ordinal:number;kind:"view"|"focus";focus_ms:number};
/** Foreground time only; server grades remain entirely independent of telemetry. */
export function useReplayRecorder(id:string,active:boolean,ordinal:number){
 const queue=useRef<Event[]>([]),sending=useRef(false),current=useRef(ordinal),enabled=useRef(active),last=useRef(0),visible=useRef(false);
 const flush=useCallback(async()=>{
  if(sending.current||!queue.current.length)return;
  sending.current=true;const batch=queue.current.slice(0,30);
  try{await kairo("learning.replay.record",{id,events:batch});const ids=new Set(batch.map(e=>e.id));queue.current=queue.current.filter(e=>!ids.has(e.id));}catch{}finally{sending.current=false;}
 },[id]);
 const accrue=useCallback(()=>{const now=performance.now(),delta=last.current?Math.min(15000,Math.max(0,now-last.current)):0;last.current=now;if(enabled.current&&visible.current&&delta>0&&queue.current.length<300)queue.current.push({id:crypto.randomUUID(),ordinal:current.current,kind:"focus",focus_ms:Math.round(delta)});},[]);
 useEffect(()=>{accrue();enabled.current=active;current.current=ordinal;visible.current=!document.hidden&&document.hasFocus();last.current=performance.now();if(active){queue.current.push({id:crypto.randomUUID(),ordinal,kind:"view",focus_ms:0});void flush();}},[active,ordinal,accrue,flush]);
 useEffect(()=>{const tick=()=>{accrue();void flush();};const visibility=()=>{accrue();visible.current=!document.hidden&&document.hasFocus();void flush();};const timer=setInterval(tick,10000);document.addEventListener("visibilitychange",visibility);window.addEventListener("focus",visibility);window.addEventListener("blur",visibility);return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",visibility);window.removeEventListener("focus",visibility);window.removeEventListener("blur",visibility);};},[accrue,flush]);
 return useCallback(async()=>{accrue();await flush();},[accrue,flush]);
}

