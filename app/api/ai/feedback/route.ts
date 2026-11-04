import { isAIBudgetError, AI_BUDGET_MESSAGE } from "@/lib/ai/budget";
export const maxDuration = 300;
import { requireAIAccess } from "@/lib/ai-access";
import { NextResponse } from "next/server";
import { generateFeedbackSummary } from "@/lib/ai/client";
import type { QuizResult } from "@/lib/types";

export async function POST(request: Request) {
  const denied = await requireAIAccess(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { result?: QuizResult };

    if (!body.result) {
      return NextResponse.json({ error: "Nəticə təqdim edilməyib." }, { status: 400 });
    }

    const feedback = await generateFeedbackSummary({ result: body.result });
    return NextResponse.json({ feedback });
  } catch (error) {
    if (isAIBudgetError(error)) return NextResponse.json({ error: AI_BUDGET_MESSAGE }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "Feedback hazırlanarkən xəta baş verdi." }, { status: 500 });
  }
}