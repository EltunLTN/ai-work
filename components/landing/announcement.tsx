"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

export function Announcement() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { data } = await getSupabase().from("site_settings").select("announcement").eq("id", 1).maybeSingle();
        if (active && data) setMessage(data.announcement);
      } catch { /* Landing page remains available when the database is unavailable. */ }
    })();
    return () => { active = false; };
  }, []);
  return message ? <aside className="border-b border-red-400/20 bg-red-400/10 px-4 py-3 text-center text-sm" aria-label="Sayt elanı">{message}</aside> : null;
}
