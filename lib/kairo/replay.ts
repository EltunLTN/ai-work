export interface ReplayEvent {id:string;ordinal:number;kind:"answer"|"view"|"focus";value?:unknown;focus_ms:number;created_at:string}
export function questionReplay(events:ReplayEvent[],ordinal:number){
 const rows=events.filter(e=>e.ordinal===ordinal);
 const answers=rows.filter(e=>e.kind==="answer");
 return {activeMs:rows.reduce((n,e)=>n+(e.kind==="focus"?Math.max(0,Math.min(15000,e.focus_ms||0)):0),0),changes:Math.max(0,answers.length-1),answers,views:rows.filter(e=>e.kind==="view").length};
}
export const MISTAKE_REASONS={unknown:"Səbəb hələ aydın deyil",knowledge:"Mövzunu bilmirdim",formula:"Düstur / hesablama səhvi",rushing:"Tələsdim",understanding:"Sualı yanlış başa düşdüm"} as const;
export type MistakeReason=keyof typeof MISTAKE_REASONS;
export const MISTAKE_ACTIONS:Record<MistakeReason,string>={unknown:"Həlli öz cavabınla müqayisə et. Səbəbi bilmirsənsə, müəllimlə addımları müzakirə et.",knowledge:"Mövzunun əsas qaydasını təkrar et, bir nümunəni addım-addım həll et, sonra mini-test işlə.",formula:"Düsturun şərtlərini və vahidləri yaz. Hesabı yenidən qur və sonda əks yoxlama et.",rushing:"Sualı iki dəfə oxu. Hesab üçün ayrıca addımlar ayır və sonda cavabı yoxla.",understanding:"Verilənləri və soruşulanı ayrı yaz. Sualı öz sözlərinlə yenidən ifadə et."};

