import textbooks from "@/data/textbooks.json";
import type { Grade, Subject, StudentProfile, TextbookReference } from "@/lib/types";

const references = textbooks as TextbookReference[];

export function getAllTextbookReferences(): TextbookReference[] {
  return references;
}

export function getGrades(): Grade[] {
  return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];
}

export function getSubjects(): Subject[] {
  return ["Riyaziyyat"];
}

export function getTextbooksBySelection(grade: Grade, subject: Subject): TextbookReference[] {
  return references.filter((item) => item.grade === grade && item.subject === subject);
}

export function getTextbookById(id: string): TextbookReference | undefined {
  return references.find((item) => item.id === id);
}

export function getDefaultProfile(): StudentProfile {
  const first = references[0];
  return {
    grade: first.grade,
    subject: first.subject,
    textbookId: first.id,
    selectedTopics: first.topics.slice(0, 4),
  };
}

export function getTopicsForProfile(profile: StudentProfile): string[] {
  return getTextbookById(profile.textbookId)?.topics ?? [];
}