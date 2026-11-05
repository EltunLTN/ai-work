export const scheduleKeys = ["registration_opens", "registration_closes", "starts_at", "ends_at"] as const;
export type ScheduleKey = typeof scheduleKeys[number];
export type TournamentSchedule = Record<ScheduleKey, string>;
export function bakuDateTime(date: Date): string {
  return new Date(date.getTime() + 4 * 3600000).toISOString().slice(0, 16);
}
export function bakuToISO(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00+04:00`);
  return Number.isFinite(date.getTime()) && bakuDateTime(date) === value ? date.toISOString() : null;
}
export function scheduleError(schedule: TournamentSchedule, mode: string): string {
  const dates = scheduleKeys.map(key => bakuToISO(schedule[key]));
  if (dates.some(date => !date)) return "Dörd tarix və saatın hamısını düzgün seç.";
  const [opens, closes, starts, ends] = dates.map(date => Date.parse(date!));
  if (opens >= closes) return "Qeydiyyatın bağlanması açılmasından sonra olmalıdır.";
  if (starts >= ends) return "Yarışın bitməsi başlamasından sonra olmalıdır.";
  if (closes > ends) return "Qeydiyyat yarış bitənə qədər bağlanmalıdır.";
  if (mode === "knockout" && closes > starts) return "Pley-off qeydiyyatı yarış başlamazdan gec olmayaraq bağlanmalıdır.";
  return "";
}
export function schedulePreset(now: Date, preset: "soon" | "tomorrow" | "weekend", mode: string): TournamentSchedule {
  const local = new Date(now.getTime() + 4 * 3600000);
  if (preset === "soon") local.setUTCMinutes(local.getUTCMinutes() + 60, 0, 0);
  else {
    const days = preset === "tomorrow" ? 1 : ((6 - local.getUTCDay() + 7) % 7 || 7);
    local.setUTCDate(local.getUTCDate() + days);
    local.setUTCHours(18, 0, 0, 0);
  }
  const start = new Date(local.getTime() - 4 * 3600000);
  return {
    registration_opens: bakuDateTime(now),
    registration_closes: bakuDateTime(start),
    starts_at: bakuDateTime(start),
    ends_at: bakuDateTime(new Date(start.getTime() + (mode === "knockout" ? 2 : 24) * 3600000)),
  };
}

