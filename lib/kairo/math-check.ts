// Deliberately small grammar. Unsupported mathematics is never marked as verified.
export function numericValue(raw: string): number | null {
  const s = raw
    .trim()
    .replaceAll(",", ".")
    .replace(/^x\s*=\s*/i, "");
  if (
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+))?$/.test(
      s,
    )
  )
    return null;
  const [a, b] = s.split("/").map(Number);
  const n = b === undefined ? a : a / b;
  return Number.isFinite(n) ? n : null;
}
function linearSide(raw: string): [number, number] | null {
  const s = raw.replaceAll(" ", "").replaceAll("−", "-").toLowerCase();
  const tokens = s.match(
    /[+-]?(?:(?:\d+(?:\.\d+)?|\.\d+)\*?)?x|[+-]?(?:\d+(?:\.\d+)?|\.\d+)/g,
  );
  if (!tokens || tokens.join("") !== s) return null;
  let a = 0,
    b = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i && t[0] !== "+" && t[0] !== "-") return null;
    if (t.endsWith("x")) {
      const n = t.slice(0, -1).replace("*", "");
      a += n === "" || n === "+" ? 1 : n === "-" ? -1 : Number(n);
    } else b += Number(t);
  }
  return [a, b];
}
export function verifyLinearAnswer(
  statement: string,
  answer: string,
): boolean | null {
  const clean = statement.trim().replace(/^\$+|\$+$/g, "");
  if (clean.split("=").length !== 2) return null;
  const [left, right] = clean.split("=").map(linearSide);
  const x = numericValue(answer);
  if (!left || !right || x === null || Math.abs(left[0] - right[0]) < 1e-12)
    return null;
  const result = (right[1] - left[1]) / (left[0] - right[0]);
  return Math.abs(x - result) <= 1e-8 * Math.max(1, Math.abs(result));
}
