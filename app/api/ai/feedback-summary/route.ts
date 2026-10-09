import { NextResponse } from "next/server";
import { generateFeedbackSummary } from "@/lib/ai/client";
import type { DiagnosticResult } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { result?: DiagnosticResult };
    if (!body.result) {
      return NextResponse.json({ error: "Nəticə məlumatı göndərilməyib." }, { status: 400 });
    }

    const feedback = await generateFeedbackSummary({ result: body.result });
    return NextResponse.json({ feedback });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feedback hazırlanarkən xəta oldu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
