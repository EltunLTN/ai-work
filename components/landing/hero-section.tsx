"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RabbitTrailVisual } from "@/components/brand/rabbit-trail-visual";
import { useLocale } from "@/hooks/use-locale";

export function HeroSection() {
  const { t } = useLocale();

  return (
    <section className="kairo-hero relative isolate overflow-hidden px-4 pb-20 pt-20 md:px-6 md:pt-24">
      <div className="kairo-hero-bg absolute inset-0 -z-10" />

      <motion.div
        className="absolute left-0 top-20 h-[2px] w-full bg-gradient-to-r from-transparent via-red-500 to-transparent"
        animate={{ x: ["-20%", "20%", "-20%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-red-400">{t.hero.tag}</p>
          <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300 md:text-lg">
            {t.hero.desc}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/onboarding">
              <Button size="lg">{t.nav.start}</Button>
            </Link>
            <Button variant="secondary" size="lg">
              <PlayCircle className="mr-2 h-4 w-4" /> {t.hero.demo}
            </Button>
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.9 }}
        >
          <RabbitTrailVisual />
        </motion.div>
      </div>
    </section>
  );
}