"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RabbitMark } from "@/components/brand/rabbit-mark";
import { LanguageToggle } from "@/components/theme/language-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export function Navbar() {
  const { t } = useLocale();
  const links = [
    { href: "/", label: t.nav.home },
    { href: "/onboarding", label: t.nav.selection },
    { href: "/quiz", label: t.nav.quiz },
    { href: "/results", label: t.nav.results },
    { href: "/plan", label: t.nav.plan },
    { href: "/dashboard", label: t.nav.dashboard },
    { href: "https://wumpus-echoes-of-the-deep.vercel.app/", label: t.nav.wumpusWorld, external: true },
    { href: "/account", label: "Hesab" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3 text-zinc-100">
          <RabbitMark className="h-8 w-8 shrink-0 text-white transition-transform duration-300 group-hover:rotate-6" />
          <div>
            <p className="text-lg font-bold tracking-wide">Kairo</p>
            <p className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.24em] text-zinc-400 sm:block">Follow the rabbit</p>
          </div>
        </Link>

        <nav aria-label="Əsas naviqasiya" className="hidden items-center gap-1 xl:flex">
          {links.map((link) =>
            link.external ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl px-3 py-2 text-sm text-amber-400 transition hover:bg-white/10 hover:text-amber-300"
              >
                {link.label} ↗
              </a>
            ) : (
              <Link key={link.href} href={link.href} className="rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white">
                {link.label}
              </Link>
            )
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/account" className="hidden rounded-xl px-3 py-2 text-sm sm:inline-flex xl:hidden">Hesab</Link>
          <LanguageToggle />
          <ThemeToggle />
          <motion.div className="hidden sm:block" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link href="/onboarding">
              <Button size="sm">{t.nav.start}</Button>
            </Link>
          </motion.div>
        </div>
      </div>
      <details className="border-t border-white/10 px-4 py-2 xl:hidden">
        <summary className="cursor-pointer py-2 text-sm text-zinc-300">Menyu</summary>
        <nav aria-label="Mobil naviqasiya" className="grid grid-cols-2 gap-2 py-3">
          {links.map(link => link.external ? <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-amber-400/10 px-3 py-3 text-sm text-amber-400">{link.label} ↗</a> : <Link key={link.href} href={link.href} className="rounded-xl px-3 py-3 text-sm text-zinc-300 hover:bg-white/10">{link.label}</Link>)}
        </nav>
      </details>
    </header>
  );
}
