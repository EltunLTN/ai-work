"use client";
import Link from "next/link";
import { AdminLink } from "@/components/admin/admin-link";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { useExperience } from "@/components/experience/experience-provider";
import { LanguageToggle } from "@/components/theme/language-toggle";
export function Footer() {
  const { replay, showRabbit, openCommands } = useExperience();
  return <footer className="site-footer"><div className="footer-top"><Link href="/" className="footer-wordmark">kairo<span>.</span></Link><p>Maraqla başla.<br />Anlayaraq davam et.</p><nav aria-label="Alt naviqasiya"><Link href="/dashboard">İnkişaf <ArrowUpRight size={14} /></Link><Link href="/onboarding">Öyrən <ArrowUpRight size={14} /></Link><Link href="/results">Nəticələr <ArrowUpRight size={14} /></Link><Link href="/account">Hesab <ArrowUpRight size={14} /></Link><Link href="/privacy">Məlumatların <ArrowUpRight size={14} /></Link><AdminLink/><Link href="/playground">Vaxt təcrübəsi <ArrowUpRight size={14} /></Link></nav></div><div className="footer-bottom"><span>ELTUN.DEV / KAİRO</span><div><button onClick={replay}><RotateCcw size={14} /> Seçimə qayıt</button><button onClick={showRabbit}>Dovşanı göstər</button><button onClick={openCommands}>Sürətli keçidlər</button><LanguageToggle /></div><span>AĞ DOVŞANIN ARDINCA GET ↗</span></div></footer>;
}
