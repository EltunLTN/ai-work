"use client";
import Link from "next/link";
import {useState,type ReactNode} from "react";
import {ArrowUpRight} from "lucide-react";
import {ModuleIcon} from "./shared";
import {FeatureVisual} from "./feature-visuals";
export function FeatureCard({href,title,icon,index,description,note,cta,target,focusLabel,focusProgress,children}:{href:string;title:string;icon:Parameters<typeof ModuleIcon>[0]["name"];index:number;description:string;note:string;cta:string;target?:number;focusLabel?:string;focusProgress?:number;children?:ReactNode}){
 const [hover,H]=useState(false),[focus,F]=useState(false);
 return <Link href={href} className={`premium-feature-card feature-kind-${index}`} onMouseEnter={()=>H(true)} onMouseLeave={()=>H(false)} onFocus={()=>F(true)} onBlur={()=>F(false)}><div className="feature-card-top"><span className="feature-card-icon"><ModuleIcon name={icon}/></span><span className="feature-card-number">0{index+1}<ArrowUpRight size={16}/></span></div><div className="feature-card-copy"><h3>{title}</h3><p>{description}</p></div><FeatureVisual index={index} active={hover||focus} target={target} focusLabel={focusLabel} focusProgress={focusProgress}/>{children}<div className="feature-card-bottom"><small>{note}</small><span>{cta}<ArrowUpRight size={14}/></span></div></Link>;
}

