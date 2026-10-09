"use client";

import { motion } from "framer-motion";
import { Brain, Sparkles, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocale } from "@/hooks/use-locale";

export function FeatureCards() {
  const { locale, t } = useLocale();
  const cards = [
    {
      title: locale === "az" ? "Diagnostic Assessment" : "Diagnostic Assessment",
      description:
        locale === "az"
          ? "Zəif mövzuları ilk 10 sualda aşkarlayır."
          : "Detects weak topics within the first 10 questions.",
      icon: Target,
    },
    {
      title: locale === "az" ? "AI Question Generator" : "AI Question Generator",
      description:
        locale === "az"
          ? "Səviyyənə uyğun yeni DİM tipli suallar yaradır."
          : "Generates fresh DİM-style questions based on your level.",
      icon: Sparkles,
    },
    {
      title: locale === "az" ? "Personalized Study Path" : "Personalized Study Path",
      description:
        locale === "az"
          ? "Sənin tempinə görə gündəlik plan və növbəti addım verir."
          : "Creates a daily plan and next step based on your pace.",
      icon: Brain,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t.landing.why}</p>
      <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">{t.landing.whyTitle}</h2>
      <p className="mt-4 max-w-2xl text-zinc-400">
        {t.landing.whyDesc}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {cards.map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card className="h-full bg-gradient-to-b from-zinc-900 to-zinc-950">
              <CardHeader>
                <item.icon className="h-7 w-7 text-red-400" />
                <CardTitle className="mt-4 text-white">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function HowItWorks() {
  const { locale, t } = useLocale();
  const steps =
    locale === "az"
      ? ["Testi həll et", "Zəif mövzularını gör", "AI planla inkişaf et"]
      : ["Take the test", "See your weak topics", "Improve with an AI plan"];

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">{t.landing.how}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <span className="text-xs uppercase tracking-[0.25em] text-red-400">0{idx + 1}</span>
            <h3 className="mt-3 text-xl font-semibold text-white">{step}</h3>
            <div className="absolute -right-8 top-1/2 h-16 w-16 rounded-full bg-red-500/15 blur-2xl" />
          </motion.div>
        ))}
      </div>
    </section>
  );
}