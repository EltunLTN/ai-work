import { NextResponse } from "next/server";
import { generateStudyPlan } from "@/lib/ai/client";
import type { Grade, StudentLevel, Subject, Topic } from "@/lib/types";

export const maxDuration = 120;

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
      resultSubmittedAt?: string;
      dailyMinutes?: number;
    };

    if (!body.grade || !body.level || !/^(?:[1-9]|10|11)$/.test(body.grade) || body.subject !== "Riyaziyyat" ||
        !["beginner", "intermediate", "advanced"].includes(body.level ?? "") ||
        (body.dailyMinutes !== undefined && ![30, 45, 60, 90].includes(body.dailyMinutes)) ||
        !Array.isArray(body.curriculumTopics) || !body.curriculumTopics.every((topic) => typeof topic === "string") ||
        (body.weakTopics !== undefined && (!Array.isArray(body.weakTopics) || !body.weakTopics.every((topic) => typeof topic === "string")))) {
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
      resultSubmittedAt: body.resultSubmittedAt,
      dailyMinutes: body.dailyMinutes ?? 60,
    });

    return NextResponse.json({ plan });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Plan yaradılarkən xəta oldu.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
