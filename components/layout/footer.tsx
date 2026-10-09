"use client";

import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export function Footer() {
  const { t } = useLocale();

  return (
    <footer className="border-t border-white/10 bg-black py-12">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 text-zinc-300 md:grid-cols-3 md:px-6">
        <div>
          <p className="text-2xl font-bold text-white">Kairo</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {t.footer.desc}
          </p>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">{t.footer.links}</p>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            <Link href="/quiz" className="hover:text-white">{t.nav.quiz}</Link>
            <Link href="/results" className="hover:text-white">{t.nav.results}</Link>
            <Link href="/plan" className="hover:text-white">{t.nav.plan}</Link>
          </div>
        </div>

        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">{t.footer.motto}</p>
          <p className="mt-3 text-sm text-zinc-400">{t.footer.mottoText}</p>
        </div>
      </div>
    </footer>
  );
}