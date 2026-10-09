import { NextResponse } from "next/server";
import { generateStudyPlan } from "@/lib/ai/client";
import type { Grade, StudentLevel, Subject, Topic } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      grade?: Grade;
      subject?: Subject;
      weakTopics?: Topic[];
      level?: StudentLevel;
      targetImprovement?: string;
      curriculumTopics?: Topic[];
      topicScores?: Array<{ topic: string; accuracy: number }>;
      errorPatterns?: string[];
      recommendedNextQuiz?: string;
    };

    if (!body.grade || !body.subject || !body.level) {
      return NextResponse.json({ error: "grade, subject, level tələb olunur." }, { status: 400 });
    }

    const plan = await generateStudyPlan({
      grade: body.grade,
      subject: body.subject,
      weakTopics: body.weakTopics ?? [],
      level: body.level,
      targetImprovement: body.targetImprovement ?? "+15% accuracy",
      curriculumTopics: body.curriculumTopics ?? [],
      topicScores: body.topicScores,
      errorPatterns: body.errorPatterns,
      recommendedNextQuiz: body.recommendedNextQuiz,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan yaradılarkən xəta oldu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
