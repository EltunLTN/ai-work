import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const maxDuration = 120;
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
  try {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await db.auth.getUser(token);
    if (error || !user) return NextResponse.json({ error: "Giriş tələb olunur." }, { status: 401 });
    const { data: admin } = await db.rpc("is_admin");
    if (admin !== true) return NextResponse.json({ error: "Admin icazəsi tələb olunur." }, { status: 403 });
    const { data: allowed } = await db.rpc("consume_ai_quota");
    if (!allowed) return NextResponse.json({ error: "Sorğu limitinə çatılıb." }, { status: 429 });
    const model = process.env.OPENAI_MODEL ?? "gpt-6.1-sol";
    const ai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60000, maxRetries: 0 });
    const response = await ai.responses.create({ model, reasoning: { effort: "low" }, store: false, max_output_tokens: 1024, input: "Only answer with the digit that is the result of 2+2." });
    if (response.status !== "completed" || response.output_text.trim() !== "4") throw new Error("validation");
    return NextResponse.json({ model, message: `${model} ilə canlı sorğu uğurludur.` }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof OpenAI.APIError ? String(error.code ?? error.status) : "connection_or_validation";
    return NextResponse.json({ error: "Model yoxlaması alınmadı.", code }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
