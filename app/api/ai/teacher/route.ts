import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAIAccess } from "@/lib/ai-access";
import { generateGuidedLesson } from "@/lib/ai/client";
import { numericValue, verifyLinearAnswer } from "@/lib/kairo/math-check";
import type { TutorState } from "@/lib/kairo/types";
export const maxDuration = 300;
export async function POST(request: Request) {
  const denied = await requireAIAccess(request);
  if (denied) return denied;
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
  let turn: {
    id: string;
    request_id: string;
    message: string;
    action: string;
  } | null = null;
  async function rpc<T>(operation: string, payload: object): Promise<T> {
    const { data, error } = await db.rpc("kairo_api", { operation, payload });
    if (error) throw new Error(error.message);
    return data as T;
  }
  try {
    const body = await request.json();
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      typeof body.id !== "string" ||
      typeof body.request_id !== "string" ||
      typeof body.message !== "string" ||
      body.message.length > 6000 ||
      ![
        "message",
        "hint1",
        "hint2",
        "hint3",
        "check",
        "solution",
        "practice",
      ].includes(body.action)
    )
      return NextResponse.json(
        { error: "Mesaj uyğun deyil." },
        { status: 400 },
      );
    if (!process.env.ACTIVITY_SERVER_SECRET)
      throw new Error("Teacher server attestation missing");
    turn = {
      id: body.id,
      request_id: body.request_id,
      message: body.message,
      action: body.action,
    };
    const state = await rpc<TutorState>("tutor.begin", turn);
    if (
      state.messages.some(
        (m) =>
          m.request_id === turn!.request_id &&
          m.role === "assistant" &&
          m.status === "complete",
      )
    )
      return NextResponse.json(state, {
        headers: { "Cache-Control": "no-store" },
      });
    const context = await rpc<{
      session: TutorState["session"];
      verification_key: {
        answer?: unknown;
        answers?: string[];
        tolerance?: number;
      } | null;
    }>("tutor.server_context", { id: turn.id });
    let checked: boolean | null = null;
    if (turn.action === "check") {
      checked = verifyLinearAnswer(
        context.session.question_context.statement ?? "",
        turn.message,
      );
      const key = context.verification_key;
      if (
        key &&
        context.session.question_context &&
        "type" in context.session.question_context
      ) {
        const type = context.session.question_context.type;
        if (type === "numeric" && numericValue(String(key.answer)) !== null) {
          const n = numericValue(turn.message);
          checked =
            n === null
              ? null
              : Math.abs(n - numericValue(String(key.answer))!) <=
                Number(key.tolerance ?? 1e-8);
        }
        if (type === "short" && key.answers)
          checked = key.answers.some(
            (a) =>
              a.trim().toLocaleLowerCase("az") ===
              turn!.message.trim().toLocaleLowerCase("az"),
          );
      }
    }
    const answer = await generateGuidedLesson(
      {
        state,
        action: turn.action,
        message: turn.message,
        verification: checked,
        verificationKey:
          turn.action === "solution" ? context.verification_key : null,
      },
      request.signal,
    );
    return NextResponse.json(
      await rpc<TutorState>("tutor.finish", {
        ...turn,
        answer,
        verified: checked === true,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (turn)
      try {
        await rpc("tutor.fail", {
          id: turn.id,
          request_id: turn.request_id,
          stopped: request.signal.aborted,
        });
      } catch {}
    return NextResponse.json(
      {
        error: request.signal.aborted
          ? "Cavab dayandırıldı."
          : error instanceof SyntaxError
            ? "Düzgün JSON göndər."
            : "AI cavabı alınmadı. Mesajı itirmədən yenidən cəhd edə bilərsən.",
      },
      {
        status: request.signal.aborted
          ? 499
          : error instanceof SyntaxError
            ? 400
            : 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
