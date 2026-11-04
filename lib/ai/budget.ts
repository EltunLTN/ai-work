import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming } from "openai/resources/responses/responses";

// Pin the explicitly eligible snapshot: aliases can change without a deployment.
export const COMPLIMENTARY_MODEL = "gpt-5.4-mini-2026-03-17";
export const AI_BUDGET_MESSAGE = "Pulsuz AI istifadəsi hazırda bağlıdır və ya gündəlik təhlükəsiz limitə çatıb. Limit Bakı vaxtı ilə 04:05-də yenilənir. Saxlanmış dərslər və sınaqlar açıqdır.";

export class AIBudgetError extends Error {
  constructor() { super(AI_BUDGET_MESSAGE); this.name = "AIBudgetError"; }
}

export function isAIBudgetError(error: unknown): boolean {
  return error instanceof Error && error.message === AI_BUDGET_MESSAGE;
}

export function reservationSize(body: ResponseCreateParamsNonStreaming): number {
  // Only text messages are eligible here. Disallow tools, images, persisted context,
  // priority service, background jobs and future SDK parameters by construction.
  const allowed = new Set(["model", "input", "reasoning", "max_output_tokens", "store", "text"]);
  if (Object.keys(body).some(key => !allowed.has(key)) || body.model !== COMPLIMENTARY_MODEL || body.store !== false) throw new AIBudgetError();
  const output = body.max_output_tokens;
  if (!Number.isSafeInteger(output) || !output || output < 1 || output > 16000) throw new AIBudgetError();
  const messages = typeof body.input === "string" ? [{ role: "user", content: body.input }] : body.input;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 30) throw new AIBudgetError();
  for (const item of messages) {
    if (!item || typeof item !== "object" || !("role" in item) || !["system", "developer", "user", "assistant"].includes(String(item.role)) || !("content" in item) || typeof item.content !== "string" || Object.keys(item).some(key => !["role", "content"].includes(key))) throw new AIBudgetError();
  }
  // Byte-level tokenization cannot consume more tokens than UTF-8 bytes. Reserve
  // twice the entire serialized request plus generous framing and full output
  // (including reasoning). Failed/aborted requests NEVER release reservations.
  const reserved = Buffer.byteLength(JSON.stringify(body), "utf8") * 2 + 8192 + messages.length * 512 + output;
  if (reserved > 300000) throw new AIBudgetError();
  return reserved;
}

export function budgetedAI() {
  return { responses: { create: async (body: ResponseCreateParamsNonStreaming, options?: { signal?: AbortSignal }) => {
    const frozenBody = structuredClone(body);
    const tokens = reservationSize(frozenBody);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const secret = process.env.ACTIVITY_SERVER_SECRET;
    if (!url || !publishable || !secret || !process.env.OPENAI_API_KEY) throw new AIBudgetError();
    options?.signal?.throwIfAborted();
    const db = createClient(url, publishable, {
      global: { headers: { "x-kairo-audit": secret } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await db.rpc("reserve_ai_tokens", { request_id: randomUUID(), requested_model: frozenBody.model, token_reservation: tokens });
    if (error || data !== true) throw new AIBudgetError();
    options?.signal?.throwIfAborted();
    // Never retry automatically or fall back to a different, paid model.
    return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 80000, maxRetries: 0 }).responses.create({ ...frozenBody, service_tier: "default" }, options);
  } } };
}
