import { getTextbookById, isSupportedSelection } from "@/lib/textbook-reference";
import type { StudentProfile, Question, QuizAnswers, Grade } from "@/lib/types";

export interface ExamSetup { id: string; grade: Grade; count: number; profiles: StudentProfile[] }
export interface ExamDraft { setupId: string; questions: Question[]; answers: QuizAnswers; index: number; elapsed: Record<string, number> }
const SETUP = "kairo.exam.setup", DRAFT = "kairo.exam.draft";
export function validExamSetup(value: unknown): value is ExamSetup {
  if (!value || typeof value !== "object") return false;
  const s = value as ExamSetup;
  return typeof s.id === "string" && s.id.length < 100 && Number.isInteger(s.count) && s.count >= 1 && s.count <= 20 &&
    Array.isArray(s.profiles) && s.profiles.length >= 1 && s.profiles.length <= 5 && s.profiles.every(p => p && typeof p === "object") && new Set(s.profiles.map(p => p.subject)).size === s.profiles.length &&
    s.profiles.every(p => p.grade === s.grade && isSupportedSelection(p.grade, p.subject) &&
      getTextbookById(p.textbookId)?.subject === p.subject && getTextbookById(p.textbookId)?.grade === s.grade &&
      Array.isArray(p.selectedTopics) && p.selectedTopics.length > 0 && p.selectedTopics.length <= 20 && p.selectedTopics.every(t => getTextbookById(p.textbookId)?.topics.includes(t)));
}
export function saveExamSetup(setup: ExamSetup) { if (!validExamSetup(setup)) throw new Error("Sınaq seçimi uyğun deyil."); sessionStorage.setItem(SETUP, JSON.stringify(setup)); sessionStorage.removeItem(DRAFT); }
export function getExamSetup(): ExamSetup | null { try { const s: unknown = JSON.parse(sessionStorage.getItem(SETUP) ?? "null"); return validExamSetup(s) ? s : null; } catch { return null; } }
export function getExamDraft(setup: ExamSetup): ExamDraft | null {
  try {
    const d: ExamDraft = JSON.parse(sessionStorage.getItem(DRAFT) ?? "null");
    if (!d || d.setupId !== setup.id || !Array.isArray(d.questions) || d.questions.length !== setup.profiles.length * setup.count ||
      d.questions.some(q => !q || typeof q.id !== "string" || typeof q.question !== "string" || typeof q.explanation !== "string" || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(o => typeof o === "string") || !Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) ||
      new Set(d.questions.map(q => q.id)).size !== d.questions.length || !Number.isInteger(d.index) || d.index < 0 || d.index >= d.questions.length || !d.answers || typeof d.answers !== "object") return null;
    if (!setup.profiles.every(p => d.questions.filter(q => q.subject === p.subject && q.grade === setup.grade && p.selectedTopics.includes(q.topic)).length === setup.count)) return null;
    if (Object.entries(d.answers).some(([id, answer]) => !d.questions.some(q => q.id === id) || !Number.isInteger(answer) || answer < 0 || answer > 3)) return null;
    return { ...d, elapsed: Object.fromEntries(setup.profiles.map(p => [p.subject, Math.max(0, Math.min(14400000, Number(d.elapsed?.[p.subject]) || 0))])) };
  } catch { return null; }
}
export function saveExamDraft(draft: ExamDraft) { sessionStorage.setItem(DRAFT, JSON.stringify(draft)); }
export function clearExamSession() { sessionStorage.removeItem(SETUP); sessionStorage.removeItem(DRAFT); }
