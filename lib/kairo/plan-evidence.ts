export interface EvidenceAttempt { attempt_id: string; subject: string; grade: string; total: number; correct: number; submitted_at: string; topic_scores: Array<{ topic: string; total: number; correct: number }> }
export function planEvidence(attempts: EvidenceAttempt[], allowedTopics: string[]) {
  const recent = [...attempts].sort((a,b) => b.submitted_at.localeCompare(a.submitted_at) || a.attempt_id.localeCompare(b.attempt_id)).slice(0, 10);
  const totals = new Map<string, { total: number; correct: number }>();
  for (const a of recent) for (const t of a.topic_scores ?? []) {
    if (!allowedTopics.includes(t.topic) || !Number.isFinite(t.total) || !Number.isFinite(t.correct) || t.total < 1 || t.correct < 0 || t.correct > t.total) continue;
    const s = totals.get(t.topic) ?? { total: 0, correct: 0 };
    s.total += t.total; s.correct += t.correct; totals.set(t.topic, s);
  }
  const topics = [...totals].map(([topic,s]) => ({topic,...s,accuracy:Math.round(100*s.correct/s.total)})).sort((a,b)=>a.accuracy-b.accuracy || a.topic.localeCompare(b.topic));
  const total = topics.reduce((n,t)=>n+t.total,0), correct = topics.reduce((n,t)=>n+t.correct,0);
  return { topics, weakTopics: topics.filter(t=>t.accuracy<70).map(t=>t.topic), total, correct, accuracy: total ? Math.round(100*correct/total) : null, latest: recent[0]?.submitted_at };
}
export const taskKey = (topic: string, task: string, day = 0) => `${day}:${topic}:${task}`;
export function planTaskCompletion(days: Array<{ day: number; topic?: string; tasks: string[] }>, completed: Record<string,boolean>) {
  const keys = days.flatMap(d=>d.tasks.map(t=>taskKey(d.topic??"",t,d.day)));
  return keys.length ? Math.round(100*keys.filter(k=>completed[k]===true).length/keys.length) : 0;
}
export function calendarDay(start: string, day: number) {
  const date = new Date(start); if (!Number.isFinite(date.getTime())) return "";
  const key = new Intl.DateTimeFormat("sv-SE", {timeZone:"Asia/Baku"}).format(date);
  return new Date(Date.parse(`${key}T12:00:00Z`)+(day-1)*86400000).toISOString().slice(0,10);
}
