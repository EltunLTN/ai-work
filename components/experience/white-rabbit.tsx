"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { VectorRabbit } from "./vector-rabbit";
export type RabbitState = "idle" | "attention" | "hop" | "running" | "curiosity" | "transition" | "resting";
/** A pre-rendered character that remains visible without WebGL or a running canvas. */
export function WhiteRabbit({state="idle",className="",onReady}:{state?:RabbitState;className?:string;onReady?:()=>void}){
 const [failed,setFailed]=useState(false);
 const image=useRef<HTMLImageElement>(null);
 useEffect(()=>{if(onReady&&(failed||(image.current?.complete&&image.current.naturalWidth>0)))queueMicrotask(onReady);},[onReady,failed]);
 if(failed)return <VectorRabbit state={state} className={className}/>;
 const hero=className.includes("hero-rabbit");
 return <span className={`white-rabbit rabbit-asset-v2 rabbit-${state} ${className}`} aria-hidden="true"><Image ref={image} className="rabbit-portrait" src="/kairo/rabbit-guide-v2.png" alt="" width={1086} height={1448} unoptimized preload={hero} loading={hero?undefined:"eager"} draggable={false} onLoad={()=>{if(onReady)requestAnimationFrame(onReady);}} onError={()=>{setFailed(true);if(onReady)requestAnimationFrame(onReady);}}/></span>;
}
