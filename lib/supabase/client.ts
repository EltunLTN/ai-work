import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
export function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Hesab xidməti konfiqurasiya edilməyib.");
  client ??= createClient(url, key);
  return client;
}

export async function aiFetch(input: string, init?: RequestInit) {
  const { data: { session } } = await getSupabase().auth.getSession();
  if (!session) {
    return Response.json({ error: "AI-dan istifadə üçün əvvəlcə Hesab bölməsindən daxil olun." }, { status: 401 });
  }
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}
