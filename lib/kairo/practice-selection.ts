import { getGrades,getTextbooksBySelection,isSupportedSelection,isSubject } from "@/lib/textbook-reference";
import type {Grade,Subject} from "@/lib/types";
export interface PracticeSelection {mode:"class"|"mixed";grade:Grade;count:number;subjects:Subject[];topics?:Partial<Record<Subject,string[]>>}
export function validPracticeSelection(value:unknown):value is PracticeSelection{
 if(!value||typeof value!=="object")return false;const s=value as PracticeSelection;
 if(!["class","mixed"].includes(s.mode)||!getGrades().includes(s.grade)||!Number.isInteger(s.count)||s.count<1||s.count>(s.mode==="mixed"?30:20)||!Array.isArray(s.subjects)||!s.subjects.length||s.subjects.length>5||new Set(s.subjects).size!==s.subjects.length||!s.subjects.every(isSubject))return false;
 if(s.topics!==undefined&&(!s.topics||typeof s.topics!=="object"||Array.isArray(s.topics)))return false;
 return s.subjects.every(subject=>s.mode==="mixed"?getGrades(subject).some(g=>Number(g)>=5&&Number(g)<=Number(s.grade)):isSupportedSelection(s.grade,subject)&&Array.isArray(s.topics?.[subject])&&!!s.topics[subject]!.length&&s.topics[subject]!.length<=20&&s.topics[subject]!.every(t=>getTextbooksBySelection(s.grade,subject).some(b=>b.topics.includes(t))));
}
/** Shuffle without assuming every subject starts in the same grade. */
export function practiceBatches(selection:PracticeSelection,random:()=>number=Math.random){
 return selection.subjects.flatMap(subject=>{
  if(selection.mode==="class")return [{subject,grade:selection.grade,count:selection.count,topics:selection.topics![subject]!}];
  const grades=getGrades(subject).filter(g=>Number(g)>=5&&Number(g)<=Number(selection.grade));
  for(let i=grades.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[grades[i],grades[j]]=[grades[j],grades[i]];}
  const chosen=grades.slice(0,Math.min(3,selection.count,grades.length));
  return chosen.map((grade,i)=>({subject,grade,count:Math.floor(selection.count/chosen.length)+(i<selection.count%chosen.length?1:0),topics:getTextbooksBySelection(grade,subject)[0].topics}));
 });
}

