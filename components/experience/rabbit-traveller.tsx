"use client";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useEffect,useState } from "react";
import type { RabbitState } from "./white-rabbit";
const RabbitCanvas=dynamic(()=>import("./rabbit-canvas"),{ssr:false,loading:()=>null});
/** One persistent renderer travels through the entrance, hero and dock. */
export function RabbitTraveller({state,reduced,home,quiet,scene="closed"}:{state:RabbitState;reduced:boolean;home:boolean;quiet:boolean;scene?:string}){
 const [docked,setDocked]=useState(!home||reduced),[box,setBox]=useState<{x:number;y:number;scale:number}|null>(null);
 useEffect(()=>{document.documentElement.classList.add("has-cinematic-rabbit");return()=>document.documentElement.classList.remove("has-cinematic-rabbit");},[]);
 useEffect(()=>{if(!home||reduced){queueMicrotask(()=>setDocked(true));return;}queueMicrotask(()=>setDocked(false));const timer=setTimeout(()=>setDocked(true),4200);const leave=()=>{if(scrollY>90)setDocked(true);};window.addEventListener("scroll",leave,{passive:true});return()=>{clearTimeout(timer);window.removeEventListener("scroll",leave);};},[home,reduced]);
 useEffect(()=>{const measure=()=>{if(scene!=="closed"){
   const portal=scene==="portal"||scene==="reveal",mobile=innerWidth<650;
   setBox({x:innerWidth*(portal?.5:scene==="chase"?.55:mobile?.68:.7)-150,y:innerHeight*(portal?.5:mobile?.65:.49)-195,scale:portal?.015:mobile?.42:.65});return;
  }const rect=document.querySelector(docked?".rabbit-launcher .white-rabbit":".hero-rabbit")?.getBoundingClientRect();if(rect?.width&&rect.height)setBox({x:rect.left+rect.width/2-150,y:rect.top+rect.height/2-195,scale:Math.min(rect.width/300,rect.height/390)});
 };const frame=requestAnimationFrame(measure),observer=new ResizeObserver(measure);observer.observe(document.body);window.addEventListener("resize",measure);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener("resize",measure);};},[docked,scene,quiet]);
 const hidden=scene==="choice"||scene==="portal"||scene==="reveal";
 return <motion.div className={`rabbit-traveller ${scene!=="closed"?"traveller-intro":docked?"traveller-docked":"traveller-hero"}`} aria-hidden="true" initial={false} animate={{x:box?.x??0,y:box?.y??0,scale:box?.scale??0,opacity:box&&!hidden?1:0,rotate:scene==="chase"?-12:0}} transition={{duration:reduced?0:scene==="portal"?1.35:1.15,ease:[.4,0,.15,1]}}><RabbitCanvas state={scene==="chase"||scene==="portal"?"running":scene!=="closed"?"attention":state} reduced={reduced}/></motion.div>;
}
