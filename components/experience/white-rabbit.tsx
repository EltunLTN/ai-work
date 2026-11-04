"use client";
import Image from "next/image";
import { useState } from "react";
import { VectorRabbit } from "./vector-rabbit";
export type RabbitState = "idle" | "attention" | "hop" | "running" | "curiosity" | "transition" | "resting";
/** A pre-rendered character that remains visible without WebGL or a running canvas. */
export function WhiteRabbit({state="idle",className=""}:{state?:RabbitState;className?:string}){
 const [failed,setFailed]=useState(false);
 if(failed)return <VectorRabbit state={state} className={className}/>;
 const hero=className.includes("hero-rabbit");
 return <span className={`white-rabbit rabbit-asset-v2 rabbit-${state} ${className}`} aria-hidden="true"><Image className="rabbit-portrait" src="/kairo/rabbit-guide-v2.png" alt="" width={1086} height={1448} unoptimized preload={hero} loading={hero?undefined:"eager"} draggable={false} onError={()=>setFailed(true)}/></span>;
}
