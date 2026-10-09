"use client";

import { useState } from "react";
import type { Question } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { getQuestionHistory } from "@/lib/storage";

interface Props {
  onGenerated: (questions: Question[]) => void;
  endpoint?: "/api/ai/diagnostic" | "/api/ai/adaptive";
  payload?: Record<string, unknown>;
  title?: string;
}

function normalizeQuestionStem(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
}

export function AIQuestionGeneratorPanel({
  onGenerated,
  endpoint = "/api/ai/diagnostic",
  payload,
  title = "AI sual generatoru",
}: Props) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parseJson<T>(raw: string): T {
    try {
      return (raw ? JSON.parse(raw) : {}) as T;
    } catch {
      return {} as T;
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const payloadMap = (payload ?? { count: 5 }) as Record<string, unknown>;
      const payloadQuestions = Array.isArray(payloadMap.existingQuestions)
        ? (payloadMap.existingQuestions as string[])
        : [];
      const excludedQuestionStems = [...getQuestionHistory(), ...payloadQuestions.map(normalizeQuestionStem)]
        .filter(Boolean)
        .slice(-250);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadMap,
          excludedQuestionStems,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }),
      });

      const raw = await response.text();
      const data = parseJson<{ questions?: Question[]; error?: string }>(raw);

      if (!response.ok || !data.questions?.length) {
        // Fallback: if adaptive generation fails, switch to diagnostic with weak topics as explicit topics.
        if (endpoint === "/api/ai/adaptive" && payload) {
          const weakTopics = Array.isArray(payloadMap.weakTopics) ? (payloadMap.weakTopics as string[]) : [];

          const fallbackPayload = {
            grade: payloadMap.grade,
            subject: payloadMap.subject,
            topics: weakTopics.length ? weakTopics : ["Ümumi mövzu"],
            count: payloadMap.count ?? 4,
            level: payloadMap.level,
            excludedQuestionStems,
          };

          const fallbackResponse = await fetch("/api/ai/diagnostic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fallbackPayload),
          });

          const fallbackRaw = await fallbackResponse.text();
          const fallbackData = parseJson<{
            questions?: Question[];
            error?: string;
          }>(fallbackRaw);

          if (fallbackResponse.ok && fallbackData.questions?.length) {
            onGenerated(fallbackData.questions);
            return;
          }
        }

        throw new Error(data.error ?? "Sual yaradıla bilmədi.");
      }
      onGenerated(data.questions);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Naməlum xəta";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="kairo-card rounded-2xl p-5">
      <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      <p className="kairo-muted mt-2 text-sm">{t.quiz.generateDesc}</p>
      <Button className="mt-4" onClick={handleGenerate} disabled={loading}>
        {loading ? t.quiz.generating : t.quiz.generate}
      </Button>
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}