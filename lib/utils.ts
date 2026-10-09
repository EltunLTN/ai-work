import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseJsonSafe<T>(input: string): T | null {
  const normalized = input.trim();

  try {
    return JSON.parse(normalized) as T;
  } catch {
    const codeFence = normalized.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const fenceBody = codeFence?.[1]?.trim();
    try {
      if (fenceBody) {
        return JSON.parse(fenceBody) as T;
      }
    } catch {
      // Continue with structural extraction.
    }

    const objectStart = normalized.indexOf("{");
    const objectEnd = normalized.lastIndexOf("}");
    const arrayStart = normalized.indexOf("[");
    const arrayEnd = normalized.lastIndexOf("]");

    const candidates: string[] = [];
    if (objectStart !== -1 && objectEnd > objectStart) {
      candidates.push(normalized.slice(objectStart, objectEnd + 1));
    }
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      candidates.push(normalized.slice(arrayStart, arrayEnd + 1));
    }

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // try next
      }
    }

    return null;
  }
}