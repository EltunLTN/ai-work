import { NextResponse } from "next/server";
import { generateDiagnosticQuestions } from "@/lib/ai/client";
import type { Grade, StudentLevel, Subject, Topic } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      grade?: Grade;
      subject?: Subject;
      topics?: Topic[];
      level?: StudentLevel;
      count?: number;
      excludedQuestionStems?: string[];
    };

    if (!body.grade || !body.subject || !body.topics?.length) {
      return NextResponse.json({ error: "Grade, subject və topics tələb olunur." }, { status: 400 });
    }

    const questions = await generateDiagnosticQuestions({
      grade: body.grade,
      subject: body.subject,
      topics: body.topics,
      level: body.level,
      count: body.count,
      excludedQuestionStems: body.excludedQuestionStems,
    });

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Diagnostic suallar yaradıla bilmədi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
