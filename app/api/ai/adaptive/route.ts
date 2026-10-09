import { NextResponse } from "next/server";
import { generateAdaptiveQuestions } from "@/lib/ai/client";
import type { Grade, StudentLevel, Subject, Topic } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      grade?: Grade;
      subject?: Subject;
      weakTopics?: Topic[];
      level?: StudentLevel;
      count?: number;
      excludedQuestionStems?: string[];
    };

    if (!body.grade || !body.subject) {
      return NextResponse.json({ error: "grade və subject tələb olunur." }, { status: 400 });
    }

    const questions = await generateAdaptiveQuestions({
      grade: body.grade,
      subject: body.subject,
      weakTopics: body.weakTopics?.length ? body.weakTopics : ["Ümumi mövzu"],
      level: body.level ?? "intermediate",
      count: body.count,
      excludedQuestionStems: body.excludedQuestionStems,
    });

    return NextResponse.json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Adaptiv suallar yaradıla bilmədi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
