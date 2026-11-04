import curriculum from "@/data/curriculum.json";
import textbooks from "@/data/textbooks.json";
import scienceTextbooks from "@/data/science-textbooks.json";
import type { Grade, Subject, StudentProfile, TextbookReference } from "@/lib/types";

// Preserve saved textbook IDs while making the supplied chapter catalogue authoritative.
const legacy = [...textbooks, ...scienceTextbooks] as TextbookReference[];
const references: TextbookReference[] = [...legacy.filter(book => !curriculum.sinif_fennler.some(row => row.fenn === book.subject && String(row.sinif) === book.grade)), ...curriculum.sinif_fennler.flatMap(row => {
 const existing = legacy.filter(b => b.subject === row.fenn && b.grade === String(row.sinif));
 const books = existing.length ? existing : [{id: row.movzular[0].id + "-book", grade: String(row.sinif), subject: row.fenn, title: row.fenn + " · " + row.sinif + "-ci sinif"}];
 return books.map(book => ({...book, grade:String(row.sinif) as Grade,subject:row.fenn as Subject,sourceLabel:"E-Dərslik · bölmə və fəsil kataloqu",sourceUrl:row.derslikler[0],topics:row.movzular.map(t=>t.basliq)}));
})];

export const SUBJECTS: Subject[] = ["Riyaziyyat", "Fizika", "Biologiya", "Coğrafiya", "Kimya"];

export function getAllTextbookReferences(): TextbookReference[] {
  return references;
}

export function getGrades(subject?: Subject): Grade[] {
  return [...new Set(references.filter((book) => !subject || book.subject === subject).map((book) => book.grade))]
    .sort((a, b) => Number(a) - Number(b));
}

export function getSubjects(): Subject[] {
  return [...SUBJECTS];
}

export function isSubject(value: unknown): value is Subject {
  return SUBJECTS.includes(value as Subject);
}

export function isSupportedSelection(grade: unknown, subject: unknown): boolean {
  return isSubject(subject) && getGrades(subject).includes(grade as Grade);
}

export function getProfileForSelection(grade: Grade, subject: Subject): StudentProfile {
  const grades = getGrades(subject);
  const selectedGrade = grades.includes(grade) ? grade : grades.find((item) => Number(item) >= Number(grade)) ?? grades[grades.length - 1];
  const book = getTextbooksBySelection(selectedGrade, subject)[0];
  return { grade: selectedGrade, subject, textbookId: book.id, selectedTopics: book.topics.slice(0, 4) };
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

