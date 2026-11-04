import { dateTime } from "@/lib/kairo/client";
const names:Record<string,string>={first_win:"İlk duel qələbəsi",first_duel_win:"İlk duel qələbəsi",five_wins:"5 duel qələbəsi",ten_wins:"10 duel qələbəsi",first_arena_win:"İlk Arena qələbəsi",weekly_champion:"Həftənin qalibi"};
export function CompetitionBadges({items}:{items:Array<{code:string;earned_at:string}>}){return <div className="module-tags">{items.map(a=><span key={a.code} title={dateTime(a.earned_at)}>✦ {names[a.code]??a.code}</span>)}</div>;}
