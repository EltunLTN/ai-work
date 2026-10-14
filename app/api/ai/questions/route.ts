import { NextResponse } from "next/server";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import type { Grade, Subject } from "@/lib/types";
import { getTextbooksBySelection, isSupportedSelection } from "@/lib/textbook-reference";

export async function POST(request: Request) {
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
  } catch {
    return NextResponse.json({ error: "Sual generatorunda xəta baş verdi." }, { status: 500 });
  }
}
