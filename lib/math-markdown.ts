/** Normalize provider LaTeX delimiters without touching literal code examples. */
export function normalizeMathMarkdown(input: string): string {
  return input.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part, i) => {
    if (i % 2) return part;
    return part.replace(/\\\[([\s\S]*?)\\\]/g, (_m, body: string) => `\n\n$$\n${body.trim()}\n$$\n\n`)
      .replace(/\\\(([^\n]*?)\\\)/g, (_m, body: string) => `$${body.trim()}$`);
  }).join("");
}

