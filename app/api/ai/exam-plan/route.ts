import { isAIBudgetError, AI_BUDGET_MESSAGE } from "@/lib/ai/budget";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAIAccess } from "@/lib/ai-access";
import { generateStudyPlan } from "@/lib/ai/client";
import {
  getTextbooksBySelection,
  isSupportedSelection,
} from "@/lib/textbook-reference";
import type { Grade, Subject, StudyPlan } from "@/lib/types";
import type { ExamState } from "@/lib/kairo/types";
export const maxDuration = 300;
export async function POST(request: Request) {
  const denied = await requireAIAccess(request);
  if (denied) return denied;
  try {
    const body = await request.json();
    if (
      !body ||
      typeof body.id !== "string" ||
      typeof body.subject !== "string"
    )
      return NextResponse.json(
        { error: "İmtahan və fənn seç." },
        { status: 400 },
      );
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: request.headers.get("authorization")!,
            "x-kairo-audit": process.env.ACTIVITY_SERVER_SECRET ?? "",
          },
        },
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    async function rpc<T>(operation: string, payload: object) {
      const { data, error } = await db.rpc("kairo_api", { operation, payload });
      if (error) throw new Error(error.message);
      return data as T;
    }
    const cached = await rpc<{ plan: StudyPlan | null }>("exam.plan.get", {
      id: body.id,
      subject: body.subject,
    });
    if (cached.plan)
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "no-store" },
      });
    const exam = await rpc<ExamState>("exam.get", { id: body.id });
    const grade = String(exam.template.grade) as Grade,
      subject = body.subject as Subject;
    if (
      exam.status !== "finalized" ||
      exam.mode !== "exam" ||
      !exam.can_reveal ||
      !isSupportedSelection(grade, subject)
    )
      return NextResponse.json(
        { error: "Yekunlaşdırılmış uyğun imtahan tələb olunur." },
        { status: 400 },
      );
    const topics = exam.result!.topics.filter((t) => t.subject === subject);
    if (!topics.length)
      return NextResponse.json(
        { error: "Bu fənn imtahanda yoxdur." },
        { status: 400 },
      );
    const curriculumTopics = [
      ...new Set(
        getTextbooksBySelection(grade, subject).flatMap((b) => b.topics),
      ),
    ];
    const scores = topics.map((t) => ({
      topic: t.topic,
      accuracy: Math.round((t.correct / t.total) * 100),
    }));
    const total = topics.reduce((n, t) => n + t.total, 0),
      correct = topics.reduce((n, t) => n + t.correct, 0),
      ratio = correct / total;
    const plan = await generateStudyPlan({
      grade,
      subject,
      weakTopics: scores.filter((t) => t.accuracy < 70).map((t) => t.topic),
      curriculumTopics,
      topicScores: scores,
      level:
        ratio < 0.5 ? "beginner" : ratio < 0.8 ? "intermediate" : "advanced",
      targetImprovement: "Bu yekun imtahanın zəif mövzularını möhkəmləndirmək",
      dailyMinutes: 45,
      resultSubmittedAt: exam.submitted_at!,
      errorPatterns: scores
        .filter((t) => t.accuracy < 70)
        .map((t) => `${t.topic}: ${t.accuracy}%`),
    });
    return NextResponse.json(
      await rpc("exam.plan.save", { id: body.id, subject, plan }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (isAIBudgetError(error)) return NextResponse.json({ error: AI_BUDGET_MESSAGE }, { status: 503, headers: { "Cache-Control": "no-store" } });
    return NextResponse.json(
      {
        error:
          "İmtahan üzrə plan hazırlanmadı. Bağlantını və AI konfiqurasiyasını yoxlayıb yenidən cəhd et.",
      },
      { status: 503 },
    );
  }
}
