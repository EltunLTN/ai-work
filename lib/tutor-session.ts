import type { StudentProfile } from "@/lib/types";

export function getTutorSessionKey(profile: StudentProfile | null): string {
  return `kairo.tutor.chat.${profile?.subject ?? "general"}.${profile?.grade ?? "unknown"}`;
}
