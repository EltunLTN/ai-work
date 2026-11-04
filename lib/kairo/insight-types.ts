import type { StudyPlan } from "@/lib/types";
import type { EvidenceAttempt } from "./plan-evidence";
export interface DuelStats { played:number; wins:number; losses:number; draws:number; rating:number }
export interface RankedPlayer extends DuelStats {public_id:string;nickname:string}
export interface PlanState {
 context:{version:string;attempts:EvidenceAttempt[]};
 saved:{plan:StudyPlan|null;source_version:string;completed:Record<string,boolean>;daily_minutes:number;updated_at:string}|null;
}
export interface Insights {
 totals:{attempts:number;total:number;correct:number;wrong:number;practice_seconds:number};
 subjects:Array<{subject:string;grade:string;attempts:number;total:number;correct:number;last_result:string}>;
 topics:Array<{subject:string;grade:string;topic:string;total:number;correct:number}>;
 duel_stats:DuelStats;
 achievements:Array<{code:string;earned_at:string}>;
 focus_week:Array<{day:string;seconds:number;rounds:number}>;
 days:Array<{day:string;attempts:number;total:number;correct:number}>;
 exams:Array<{id:string;name:string;status:string;mode:string;started_at:string;grade:string;total:number|null;correct:number|null;earned:number|null;maximum:number|null;pending:number|null}>;
 duels:Array<{id:string;status:string;settings:{subject:string;grade:number;count:number};created_at:string;outcome:string|null;delta:number|null;score:number;correct:number;wrong:number;opponent:{nickname:string}|null}>;
 tutor:{sessions:number;completed:number;hints:number;verified:number};
 plans:Array<NonNullable<PlanState["saved"]>&{subject:string;grade:number}>;
 practice:EvidenceAttempt[];
}
