"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";

export function DashboardPreview() {
  const { locale, t } = useLocale();

  return (
    <section id="product-preview" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-16 md:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t.landing.preview}</p>
      <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6 md:p-10">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-sm text-zinc-400">{t.landing.currentPrediction}</p>
            <p className="mt-2 text-4xl font-black text-white">— / 100</p>
            <p className="text-sm text-red-400">{locale === "az" ? "Sınaqdan sonra hesablanır" : "Calculated after your quiz"}</p>
            <p className="kairo-muted mt-2 text-xs">{locale === "az" ? "Aşağıdakı qrafik interfeys nümunəsidir, şəxsi nəticən deyil." : "The chart below is an interface example, not your result."}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:col-span-2">
            <p className="text-sm text-zinc-400">{t.landing.topicPerformance}</p>
            <div className="mt-4 space-y-3">
              {[
                { label: locale === "az" ? "Riyaziyyat" : "Math", value: 58 },
                { label: locale === "az" ? "Cəbr" : "Algebra", value: 71 },
                { label: locale === "az" ? "Həndəsə" : "Geometry", value: 64 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex justify-between text-xs text-zinc-400">
                    <span>{item.label}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-300"
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.value}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.7 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  const { t } = useLocale();

  return (
    <section className="px-4 py-20 md:px-6">
      <div className="mx-auto w-full max-w-5xl rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-500/20 via-zinc-950 to-zinc-950 p-10 text-center">
        <h2 className="text-3xl font-black text-white md:text-5xl">{t.landing.ctaTitle}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-zinc-300">{t.landing.ctaDesc}</p>
        <div className="mt-8">
          <Link href="/onboarding">
            <Button size="lg">
              {t.landing.ctaButton} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
