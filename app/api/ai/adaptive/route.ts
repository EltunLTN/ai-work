import { NextResponse } from "next/server";
import { generateAdaptiveQuestions } from "@/lib/ai/client";
import type { Grade, StudentLevel, Subject, Topic } from "@/lib/types";
import { getTextbooksBySelection, isSupportedSelection } from "@/lib/textbook-reference";

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

    if (!body.grade || !body.subject || !isSupportedSelection(body.grade, body.subject) ||
        (body.weakTopics !== undefined && (!Array.isArray(body.weakTopics) || !body.weakTopics.every((topic) => typeof topic === "string" && topic.trim())))) {
      return NextResponse.json({ error: "grade və subject tələb olunur." }, { status: 400 });
    }

    const questions = await generateAdaptiveQuestions({
      grade: body.grade,
      subject: body.subject,
      weakTopics: body.weakTopics?.length ? body.weakTopics : getTextbooksBySelection(body.grade, body.subject)[0].topics.slice(0, 4),
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
