"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";
import { flushActivity, trackActivity } from "@/lib/activity-client";
export function ActivityProvider() {
  const path = usePathname();
  useEffect(() => { trackActivity("page.view"); }, [path]);
  useEffect(() => {
    const click = (e: MouseEvent) => {
      const element = e.target instanceof Element ? e.target.closest<HTMLElement>("button,a,[data-activity]") : null;
      if (!element || element.closest(".choice-scene")) return;
      const href = element.getAttribute("href");
      trackActivity("ui.click", { control: element.dataset.activity || element.getAttribute("aria-label")?.slice(0,80) || element.tagName.toLowerCase(), ...(href?.startsWith("/") ? { destination: href.split("?")[0].slice(0,120) } : {}) });
    };
    const submit = (e: Event) => { const form=e.target as HTMLFormElement; trackActivity("form.submitted", { control: form.dataset.activity || "form" }); };
    const hide = () => { if (document.hidden) void flushActivity(); };
    let currentUser: string | null = null;
    const listener = getSupabase().auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user.id ?? null;
      if (event === "SIGNED_IN" && nextUser !== currentUser) queueMicrotask(() => trackActivity("auth.signed_in"));
      currentUser = nextUser;
      // The sign-out button is captured before token revocation; auth.users audit logs retain the actual auth event.
    });
    document.addEventListener("click",click); document.addEventListener("submit",submit); document.addEventListener("visibilitychange",hide);
    return () => { listener.data.subscription.unsubscribe(); document.removeEventListener("click",click);document.removeEventListener("submit",submit);document.removeEventListener("visibilitychange",hide); };
  }, []);
  return null;
}
