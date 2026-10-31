export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
export function attemptsCsv(rows: Array<{ submitted_at: string; subject: string; grade: string; kind: string; total: number; correct: number; duration_seconds: number | null }>) {
  return "\uFEFF" + [["Tarix", "Fənn", "Sinif", "Növ", "Sual", "Düzgün", "Səhv", "Saniyə"].map(csvCell).join(","), ...rows.map(r => [r.submitted_at, r.subject, r.grade, r.kind, r.total, r.correct, r.total - r.correct, r.duration_seconds].map(csvCell).join(","))].join("\r\n");
}
