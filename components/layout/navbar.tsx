"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowUpRight, Command, Menu, RotateCcw, X } from "lucide-react";
import { RabbitMark } from "@/components/brand/rabbit-mark";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useLocale } from "@/hooks/use-locale";
import { useExperience } from "@/components/experience/experience-provider";

export function Navbar() {
  const { t } = useLocale();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { replay, openCommands } = useExperience();
  const links = [{ href: "/onboarding", label: t.nav.selection }, { href: "/quiz", label: t.nav.quiz }, { href: "/plan", label: t.nav.plan }, { href: "/dashboard", label: "İnkişaf" }, { href: "/kairo", label: "Alətlər" }];
  useEffect(() => { queueMicrotask(() => setOpen(false)); }, [path]);
  return <header className="site-nav" onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}><div className="nav-inner">
    <Link className="wordmark" href="/" aria-label="Kairo — ana səhifə"><RabbitMark className="nav-rabbit" /><span>kairo<span className="wordmark-dot">.</span></span><small>MARAĞININ ARDINCA GET</small></Link>
    <nav className="desktop-nav" aria-label="Əsas naviqasiya">{links.map(l => <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link>)}</nav>
    <div className="nav-tools"><button className="icon-control command-trigger" onClick={openCommands} aria-label="Sürətli keçidlər — Ctrl və ya Command K"><Command size={17} /><kbd>K</kbd></button><div className="nav-theme"><ThemeToggle /></div><Link className="nav-account" href="/account">Hesab <ArrowUpRight size={15} /></Link><button className="mobile-toggle icon-control" aria-label={open ? "Menyunu bağla" : "Menyunu aç"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div>
  </div>{open && <nav className="mobile-nav" id="mobile-nav" aria-label="Mobil naviqasiya"><Link href="/" onClick={() => setOpen(false)}>Ana səhifə <span>00</span></Link>{links.map((l, i) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={path === l.href ? "page" : undefined}>{l.label}<span>0{i + 1}</span></Link>)}<Link href="/results">Nəticələr <ArrowUpRight size={18} /></Link><Link href="/account">Hesab <ArrowUpRight size={18} /></Link><div className="mobile-nav-footer"><button onClick={() => { setOpen(false); replay(); }}><RotateCcw size={15} /> Girişə qayıt</button><div className="flex items-center gap-3"><ThemeToggle /><LanguageToggle /></div></div></nav>}</header>;
}
