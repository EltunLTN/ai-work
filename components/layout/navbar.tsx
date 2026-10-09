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
    { href: "/wumpus_world_v2.html", label: t.nav.wumpusWorld, external: true },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="group flex items-center gap-3 text-zinc-100">
          <RabbitMark className="h-8 w-8 text-white transition-transform duration-300 group-hover:rotate-6" />
          <div>
            <p className="text-lg font-bold tracking-wide">Kairo</p>
            <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">Follow the rabbit</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
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

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link href="/onboarding">
              <Button size="sm">{t.nav.start}</Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </header>
  );
}