import type { MockPoint } from "./types";
export function admissionProgress(history: MockPoint[], target: number) {
  const compatible = history.filter(
    (h) =>
      h.scale === "dim700" &&
      Number(h.maximum) === 700 &&
      (h.official_format === true || h.official_format === "true"),
  );
  const last = compatible.at(-1);
  return last
    ? {
        score: Number(last.earned),
        gap: Math.max(0, target - Number(last.earned)),
        percent: target
          ? Math.min(100, (Number(last.earned) / target) * 100)
          : 100,
      }
    : null;
}
