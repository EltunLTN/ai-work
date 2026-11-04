import { isAIBudgetError, AI_BUDGET_MESSAGE } from "@/lib/ai/budget";
export const maxDuration = 300;
import { requireAIAccess } from "@/lib/ai-access";
import { NextResponse } from "next/server";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import type { Grade, Subject } from "@/lib/types";
import { getTextbooksBySelection, isSupportedSelection } from "@/lib/textbook-reference";

export async function POST(request: Request) {
  const denied = await requireAIAccess(request);
  if (denied) return denied;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      grade?: Grade;
      subject?: Subject;
      topics?: string[];
      count?: number;
    };
    const count = Math.max(3, Math.min(8, body.count ?? 5));
    const grade = body.grade ?? "7";
    const subject = body.subject ?? "Riyaziyyat";
    if (!isSupportedSelection(grade, subject)) return NextResponse.json({ error: "Fənn və sinif seçimi uyğun deyil." }, { status: 400 });
    const questions = await generateDiagnosticQuestions({
      grade,
      subject,
      topics: body.topics ?? getTextbooksBySelection(grade, subject)[0].topics.slice(0, 3),
      count,
    });

    return NextResponse.json({ questions });
  } catch (error) {
    if (isAIBudgetError(error)) return NextResponse.json({ error: AI_BUDGET_MESSAGE }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json({ error: "Sual generatorunda xəta baş verdi." }, { status: 500 });
  }
}
