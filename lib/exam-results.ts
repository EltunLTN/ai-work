import { evaluateDiagnostic } from "@/lib/analytics";
import type { ExamSetup } from "@/lib/exam-session";
import type { Question, QuizAnswers } from "@/lib/types";
export function scoreExam(setup: ExamSetup, questions: Question[], answers: QuizAnswers, elapsed: Record<string,number>, completedAt: number) {
  if (!questions.length || new Set(questions.map(q=>q.id)).size !== questions.length || questions.some(q=>q.grade!==setup.grade || !setup.profiles.some(p=>p.subject===q.subject) || !Number.isInteger(answers[q.id]) || answers[q.id]<0 || answers[q.id]>3)) throw new Error("Incomplete exam");
  return setup.profiles.map((profile,i)=>{
    const batch=questions.filter(q=>q.subject===profile.subject);
    if (!batch.length || batch.length>20) throw new Error("Invalid subject count");
    const result=evaluateDiagnostic(batch,answers,profile);
    result.submittedAt=new Date(completedAt+i).toISOString();
    result.durationSeconds=Math.round(Math.max(0,Math.min(14400000,elapsed[profile.subject]||0))/1000);
    return result;
  });
}
