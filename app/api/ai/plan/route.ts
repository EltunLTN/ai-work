import { NextResponse } from "next/server";
import { generateStudyPlan } from "@/lib/ai/client";
import type { QuizResult } from "@/lib/types";

interface PlanBody {
  result?: QuizResult;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PlanBody;

    if (!body.result) {
      return NextResponse.json({ error: "Nəticə məlumatı yoxdur." }, { status: 400 });
    }

    const plan = await generateStudyPlan({
      grade: body.result.grade,
      subject: body.result.subject,
      weakTopics: body.result.weakTopics,
      level: body.result.level,
      targetImprovement: "+15% accuracy",
      curriculumTopics: body.result.topicScores.map((item) => item.topic),
    });

    return NextResponse.json({ plan });
  } catch {
    return NextResponse.json({ error: "Plan yaradılarkən xəta baş verdi." }, { status: 500 });
  }
}