import { NextResponse } from "next/server";
import { parseChatInput } from "@/lib/ai/chat-input";
import { generateTutorReply } from "@/lib/ai/client";

export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const text = await request.text();
    if (text.length > 100000) return NextResponse.json({ error: "Mesaj həddən artıq uzundur." }, { status: 413 });
    const input = parseChatInput(JSON.parse(text));
    if (!input) return NextResponse.json({ error: "Düzgün mesaj göndərin (maksimum 20 mesaj, hər biri 6000 simvol)." }, { status: 400 });
    const reply = await generateTutorReply(input);
    return NextResponse.json(reply);
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Sorğu JSON formatında olmalıdır." }, { status: 400 });
    const missingKey = error instanceof Error && error.message.includes("OPENAI_API_KEY");
    return NextResponse.json({ error: missingKey
      ? "AI xidməti konfiqurasiya edilməyib. Serverdə OPENAI_API_KEY təyin edilməlidir."
      : "AI hazırda cavab verə bilmir. Bir az sonra yenidən cəhd edin." }, { status: 503 });
  }
}
