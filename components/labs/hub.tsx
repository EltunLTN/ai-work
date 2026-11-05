"use client";
import dynamic from "next/dynamic";
import {useEffect,useState} from "react";
import {LABS,type LabId} from "@/lib/labs/catalog";
import {ModuleHeading} from "@/components/kairo/shared";
const loading=()=> <p className="module-panel" role="status">Təcrübə yüklənir…</p>;
const MathLabs=dynamic(()=>import('./math-labs'),{loading});
const PhysicsLabs=dynamic(()=>import('./physics-labs'),{loading});
const ChemistryLabs=dynamic(()=>import('./chemistry-labs'),{loading});
const GeographyLabs=dynamic(()=>import('./geography-labs'),{loading});
const InformaticsLabs=dynamic(()=>import('./informatics-labs'),{loading});
export function LaboratoryHub(){
 const [selected,setSelected]=useState<LabId>('function'),[subject,setSubject]=useState('Hamısı'),[search,setSearch]=useState('');
 useEffect(()=>{const id=new URLSearchParams(location.search).get('lab');if(LABS.some(l=>l[0]===id))queueMicrotask(()=>setSelected(id as LabId));},[]);
 const lab=LABS.find(l=>l[0]===selected)!;
 function select(id:LabId){setSelected(id);history.replaceState(null,'',`/kairo/lab?lab=${id}#experiment`);}
 const Component=lab[1]==='Riyaziyyat'?MathLabs:lab[1]==='Fizika'?PhysicsLabs:lab[1]==='Kimya'?ChemistryLabs:lab[1]==='Coğrafiya'?GeographyLabs:InformaticsLabs;
 return <><ModuleHeading eyebrow={`LABORATORİYA / ${LABS.length} İNTERAKTİV TƏCRÜBƏ`} title="Biliyi hərəkətə gətir." description="Beş istiqamət, dəyişən parametrlər və canlı nəticələr. Bütün təcrübələr brauzerində işləyir, AI tokeni sərf etmir."/><div className="lab-browser"><label className="sr-only" htmlFor="lab-search">Laboratoriya axtar</label><input id="lab-search" className="account-field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Mövzu və ya laboratoriya axtar…"/><div className="module-tabs" role="group" aria-label="Laboratoriya fənni">{['Hamısı',...new Set(LABS.map(l=>l[1]))].map(s=><button key={s} aria-pressed={subject===s} onClick={()=>setSubject(s)}>{s}</button>)}</div></div><div className="laboratory-layout"><nav className="laboratory-catalog" aria-label="Təcrübələr">{LABS.filter(l=>(subject==='Hamısı'||l[1]===subject)&&l.join(' ').toLocaleLowerCase('az').includes(search.toLocaleLowerCase('az'))).map(l=><button key={l[0]} aria-pressed={selected===l[0]} onClick={()=>select(l[0])}><span>{String(LABS.indexOf(l)+1).padStart(2,'0')} / {l[1]}</span><strong>{l[2]}</strong><small>{l[4]}</small></button>)}</nav><section id="experiment" className="active-experiment"><header><p className="eyebrow">{lab[1]} / {lab[3]}</p><h2>{lab[2]}</h2><p>{lab[4]}</p></header><Component key={selected} id={selected}/></section></div></>;
}

