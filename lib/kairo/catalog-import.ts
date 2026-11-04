export function parseCatalogCSV(text: string): Record<string, string>[] {
  if (text.length > 180000)
    throw new Error("CSV faylı 180 KB-dan kiçik olmalıdır.");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (quoted || !field) quoted = !quoted;
      else throw new Error("CSV dırnaqları düzgün deyil.");
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV-də bağlanmamış dırnaq var.");
  row.push(field);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((x) => x.trim().replace(/^\uFEFF/, ""));
  if (!headers || new Set(headers).size !== headers.length)
    throw new Error("Unikal CSV başlıqları tələb olunur.");
  const allowed = [
    "university",
    "name",
    "code",
    "admission_group",
    "language",
    "study_format",
    "year",
    "cutoff",
    "state_cutoff",
    "minimum_requirement",
    "source_url",
    "source_published",
  ];
  if (
    headers.some((h) => !allowed.includes(h)) ||
    ["university", "name", "year", "source_url"].some(
      (h) => !headers.includes(h),
    )
  )
    throw new Error(
      "Başlıqlar: university,name,year,source_url tələb olunur; naməlum başlıq qəbul edilmir.",
    );
  if (!rows.length || rows.length > 500) throw new Error("1–500 sətir yüklə.");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw new Error(`${i + 2}-ci sətrin sütun sayı uyğun deyil.`);
    const p = Object.fromEntries(headers.map((h, n) => [h, r[n].trim()]));
    let u: URL;
    try {
      u = new URL(p.source_url);
    } catch {
      throw new Error(`${i + 2}: mənbə URL düzgün deyil.`);
    }
    if (u.protocol !== "https:" || u.username || u.password)
      throw new Error(`${i + 2}: HTTPS mənbə tələb olunur.`);
    if (!/^20\d\d$/.test(p.year)) throw new Error(`${i + 2}: il düzgün deyil.`);
    for (const k of ["cutoff", "state_cutoff"])
      if (p[k] && !(/^\d+(\.\d+)?$/.test(p[k]) && Number(p[k]) <= 700))
        throw new Error(`${i + 2}: keçid balı 0–700 olmalıdır.`);
    if (
      (p.cutoff || p.state_cutoff) &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(p.source_published ?? "") ||
        Number(p.year) > new Date().getFullYear())
    )
      throw new Error(
        `${i + 2}: tarixi keçid balı üçün mənbənin nəşr tarixi və cari/keçmiş il tələb olunur.`,
      );
    return p;
  });
}
