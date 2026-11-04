"use client";
import Link from "next/link";
import { useState } from "react";
import { useKairo } from "@/lib/kairo/client";
export function StudentIdentity(){
 const q=useKairo<{student_id:string}>("learning.identity.get"),[copied,setCopied]=useState(false);
 if(!q.data)return null;
 return <section className="student-identity"><div><p className="eyebrow">SƏNİN ÖYRƏNMƏ PASPORTUN</p><strong>Şagird ID</strong><code>{q.data.student_id}</code><p>Gələcəkdə müəllimin sinfinə qoşulmaq üçün sabit identifikatorun. Bu ID giriş şifrəsi deyil.</p></div><button className="module-button" onClick={()=>void navigator.clipboard.writeText(q.data!.student_id).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?"Kopyalandı ✓":"ID-ni kopyala"}</button></section>;
}
export function LearningDiscoveries(){return <section className="discovery-grid" aria-label="Yeni öyrənmə alətləri">{[
 ["01","İmtahanı yenidən izlə","Sual vaxtları, cavab dəyişiklikləri və nəticə tarixçən.","/kairo/mistakes"],
 ["02","Səhv analizi","Səhvin səbəbini qeyd et, uyğun mövzu ilə yenidən məşq et.","/kairo/mistakes"],
 ["03","Virtual laboratoriya","Qrafiki dəyiş, fiquru hərəkət etdir, qüvvəni sına.","/kairo/lab"]
].map(([n,title,body,href])=><Link key={n} href={href} className="discovery-card"><span>{n} / KƏŞF ET</span><h3>{title}</h3><p>{body}</p><strong>Aç ↗</strong></Link>)}</section>}

