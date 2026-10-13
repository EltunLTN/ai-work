import { NextResponse } from "next/server";
import { generateFeedbackSummary } from "@/lib/ai/client";
import type { DiagnosticResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      result?: DiagnosticResult;
      review?: Array<{ topic: string; question: string; selectedAnswer: string; correctAnswer: string }>;
    };
    if (!body.result) {
      return NextResponse.json({ error: "Nəticə məlumatı göndərilməyib." }, { status: 400 });
    }

    const review = Array.isArray(body.review) ? body.review.slice(0, 30).filter((item) => item &&
      [item.topic, item.question, item.selectedAnswer, item.correctAnswer].every((text) => typeof text === "string" && text.length <= 4000)) : [];
    const feedback = await generateFeedbackSummary({ result: body.result, review });
    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback hazırlanarkən xəta oldu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
