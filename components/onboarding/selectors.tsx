"use client";

import type { Grade, StudentProfile, Subject, TextbookReference } from "@/lib/types";
import { useLocale } from "@/hooks/use-locale";
import { getGrades, getSubjects, getTextbooksBySelection } from "@/lib/textbook-reference";

interface GradeSubjectSelectorProps {
  grade: Grade;
  subject: Subject;
  onChange: (payload: { grade: Grade; subject: Subject }) => void;
}

export function GradeSubjectSelector({ grade, subject, onChange }: GradeSubjectSelectorProps) {
  const { t } = useLocale();
  const grades = getGrades(subject);
  const subjects = getSubjects();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2">
        <span className="kairo-muted text-sm">{t.onboarding.grade}</span>
        <select
          value={grade}
          onChange={(e) => onChange({ grade: e.target.value as Grade, subject })}
          className="kairo-input w-full rounded-2xl px-4 py-3"
        >
          {grades.map((item) => (
            <option key={item} value={item}>
              {item}{t.onboarding.grade === "Sinif" ? "-ci sinif" : " grade"}
            </option>
          ))}
        </select>
      </label>

      <label className="space-y-2">
        <span className="kairo-muted text-sm">{t.onboarding.subject}</span>
        <select
          value={subject}
          onChange={(e) => onChange({ grade, subject: e.target.value as Subject })}
          className="kairo-input w-full rounded-2xl px-4 py-3"
        >
          {subjects.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

interface TextbookSelectorProps {
  profile: StudentProfile;
  onSelect: (textbookId: string) => void;
  onToggleTopic: (topic: string) => void;
}

export function TextbookSelector({ profile, onSelect, onToggleTopic }: TextbookSelectorProps) {
  const { t } = useLocale();
  const textbooks: TextbookReference[] = getTextbooksBySelection(profile.grade, profile.subject);
  const activeTextbook = textbooks.find((book) => book.id === profile.textbookId);

  return (
    <div className="space-y-3">
      <p className="kairo-muted text-sm">{t.onboarding.pickBook}</p>
      <div className="grid gap-3">
        {textbooks.map((book) => {
          const active = book.id === profile.textbookId;
          return (
            <button
              key={book.id}
              onClick={() => onSelect(book.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                active ? "border-red-400 bg-red-500/10" : "border-white/10 bg-zinc-900/60 hover:border-white/25"
              }`}
            >
              <p className="text-base font-semibold">{book.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">{book.sourceLabel}</p>
              <p className="kairo-muted mt-2 text-sm">{t.onboarding.topicsLabel}: {book.topics.slice(0, 3).join(", ")}...</p>
              {book.sourceUrl ? (
                <p className="mt-1 text-xs text-zinc-500">{t.onboarding.ref}: {book.sourceUrl}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      {activeTextbook ? (
        <div className="kairo-card rounded-2xl p-4">
          <p className="kairo-muted mb-3 text-sm">{t.onboarding.topicsPick}</p>
          <div className="grid gap-2 md:grid-cols-2">
            {activeTextbook.topics.map((topic) => {
              const selected = profile.selectedTopics.includes(topic);
              return (
                <button
                  key={topic}
                  onClick={() => onToggleTopic(topic)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selected
                      ? "border-red-400 bg-red-500/10 text-red-100"
                      : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-white/20"
                  }`}
                >
                  {topic}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
