"use client";

import { motion } from "framer-motion";
import { useLocale } from "@/hooks/use-locale";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";

interface QuizCardProps {
  question: Question;
  questionNumber: number;
  total: number;
  selectedIndex?: number;
  onSelect: (index: number) => void;
}

export function QuizCard({ question, questionNumber, total, selectedIndex, onSelect }: QuizCardProps) {
  const { t } = useLocale();

  return (
    <motion.div
      key={question.id}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 md:p-8"
    >
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-zinc-400">
        <span>{t.quiz.qLabel} {questionNumber}/{total}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-red-400/30 px-3 py-1 text-red-300">{question.topic}</span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-zinc-300">{question.difficulty}</span>
        </div>
      </div>
      <h2 className="text-xl font-semibold leading-relaxed text-white">{question.question}</h2>
      <div className="mt-6 grid gap-3">
        {question.options.map((option, idx) => (
          <button
            key={option}
            onClick={() => onSelect(idx)}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left text-sm transition",
              selectedIndex === idx
                ? "border-red-400 bg-red-500/15 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-300 hover:border-white/25",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </motion.div>
  );
}