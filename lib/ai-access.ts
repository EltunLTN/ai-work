import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Verify access inside every AI handler, including compatibility routes.
export async function requireAIAccess(request: Request) {
  const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 150000) return reply("Sorğu həddən artıq böyükdür.", 413);
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return reply("AI-dan istifadə üçün hesabınıza daxil olun.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return reply("Hesab xidməti hazır deyil.", 503);
  try {
    const db = createClient(url, key, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
    const { data: { user }, error } = await db.auth.getUser(authorization.slice(7));
    if (error || !user || !user.email_confirmed_at) return reply("Təsdiqlənmiş hesabla daxil olun.", 401);
    const { data: allowed, error: quotaError } = await db.rpc("consume_ai_quota");
    if (quotaError) return reply("İstifadə limiti yoxlanıla bilmədi. Yenidən cəhd edin.", 503);
    if (!allowed) return reply("Gündəlik 100 AI sorğusu limitinə çatılıb və ya hesab üçün AI istifadəsi dayandırılıb.", 429);
    return null;
  } catch {
    return reply("Hesab xidməti ilə əlaqə qurulmadı.", 503);
  }
}
