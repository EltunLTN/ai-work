"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { GradeSubjectSelector, TextbookSelector } from "@/components/onboarding/selectors";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/use-locale";
import { getDefaultProfile, getProfileForSelection, getTextbooksBySelection } from "@/lib/textbook-reference";
import { saveStudentProfile } from "@/lib/storage";
import type { Grade, StudentProfile, Subject } from "@/lib/types";

export default function OnboardingPage() {
  const { t } = useLocale();
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile>(() => getDefaultProfile());

  const textbooks = useMemo(
    () => getTextbooksBySelection(profile.grade, profile.subject),
    [profile.grade, profile.subject],
  );

  function updateGradeSubject(payload: { grade: Grade; subject: Subject }) {
    setProfile(getProfileForSelection(payload.grade, payload.subject));
  }

  function toggleTopic(topic: string) {
    setProfile((prev) => {
      const exists = prev.selectedTopics.includes(topic);
      const next = exists
        ? prev.selectedTopics.filter((item) => item !== topic)
        : [...prev.selectedTopics, topic];

      return {
        ...prev,
        selectedTopics: next.length ? next : [topic],
      };
    });
  }

  function startQuiz() {
    saveStudentProfile(profile);
    router.push("/quiz");
  }

  return (
    <div className="kairo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10 md:px-6">
        <div>
          <h1 className="text-3xl font-black md:text-4xl">{t.onboarding.title}</h1>
          <p className="mt-2 max-w-2xl text-zinc-400">
            {t.onboarding.subtitle}
          </p>
        </div>

        <div className="kairo-card space-y-6 rounded-3xl p-6">
          <GradeSubjectSelector
            grade={profile.grade}
            subject={profile.subject}
            onChange={updateGradeSubject}
          />

          <TextbookSelector
            profile={profile}
            onSelect={(textbookId) => {
              const picked = textbooks.find((book) => book.id === textbookId);
              setProfile((p) => ({
                ...p,
                textbookId,
                selectedTopics: picked?.topics.slice(0, 4) ?? p.selectedTopics,
              }));
            }}
            onToggleTopic={toggleTopic}
          />

          <div className="kairo-card rounded-2xl p-4 text-sm kairo-muted">
            {t.onboarding.source}: {textbooks.find((book) => book.id === profile.textbookId)?.title ?? "-"}
            <br />
            {t.onboarding.topicsCount}: {profile.selectedTopics.length}
          </div>

          <Button onClick={startQuiz} size="lg" disabled={profile.selectedTopics.length === 0}>
            {t.onboarding.start}
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
