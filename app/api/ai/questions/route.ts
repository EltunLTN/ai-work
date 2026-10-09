import { NextResponse } from "next/server";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import type { Grade, Subject } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      grade?: Grade;
      subject?: Subject;
      topics?: string[];
      count?: number;
    };
    const count = Math.max(3, Math.min(8, body.count ?? 5));
    const questions = await generateDiagnosticQuestions({
      grade: body.grade ?? "7",
      subject: body.subject ?? "Riyaziyyat",
      topics: body.topics ?? ["Faiz", "Kəsrlər", "Sadə tənliklər"],
      count,
    });

    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ error: "Sual generatorunda xəta baş verdi." }, { status: 500 });
  }
}