import type { Grade, LearningResource, Subject } from "@/lib/types";

export interface LearningResourceBundle { material?: LearningResource; video?: LearningResource; test: LearningResource }
// Only specific lessons belong here. Missing coverage never falls back to a subject homepage.
export const VERIFIED_RESOURCE_CATALOG: Array<{ subject: Subject; matches: RegExp; title: string; material: string; video?: string; provider: string; videoProvider?: string; minGrade?: number }> = [
  { subject: "Riyaziyyat", matches: /inteqral/iu, title: "İbtidai funksiya və qeyri-müəyyən inteqral", material: "https://tutorial.math.lamar.edu/Classes/CalcI/IndefiniteIntegrals.aspx", video: "https://www.youtube.com/watch?v=rfG8ce4nNh0", provider: "Paul’s Online Math Notes", videoProvider: "3Blue1Brown", minGrade: 10 },
  { subject: "Riyaziyyat", matches: /törəmə/iu, title: "Törəmə anlayışı", material: "https://tutorial.math.lamar.edu/Classes/CalcI/DerivativeIntro.aspx", video: "https://www.youtube.com/watch?v=rAof9Ld5sOg", provider: "Paul’s Online Math Notes", videoProvider: "Khan Academy", minGrade: 10 },
  { subject: "Biologiya", matches: /fotosintez/iu, title: "Fotosintez", material: "https://www.khanacademy.org/science/biology/photosynthesis-in-plants", video: "https://www.khanacademy.org/science/biology/v/photosynthesis", provider: "Khan Academy", minGrade: 6 },
  { subject: "Kimya", matches: /^atomun quruluşu$/iu, title: "Atomun quruluşu", material: "https://www.khanacademy.org/science/chemistry/atomic-structure", video: "https://www.khanacademy.org/science/class-9-chemistry/x46dd29ce84a663ea%3Aatoms-and-molecules/x46dd29ce84a663ea%3Awhat-is-an-atom/v/introduction-to-the-atom", provider: "Khan Academy", minGrade: 7 },
  { subject: "Fizika", matches: /nyutonun birinci qanunu/iu, title: "Nyutonun birinci qanunu", material: "https://www.khanacademy.org/science/physics/newtons-laws-of-motion", video: "https://www.khanacademy.org/science/physics/mechanics/v/newton-s-1st-law-of-motion", provider: "Khan Academy", minGrade: 7 },
  { subject: "Coğrafiya", matches: /litosfer tavalar/iu, title: "Litosfer tavalarının hərəkəti", material: "https://www.usgs.gov/educational-resources/plate-tectonics", provider: "USGS", minGrade: 6 },
];

export function topicQuizResource(topic: string, grade?: Grade, subject: Subject = "Riyaziyyat"): LearningResource {
  return { kind: "test", title: `${topic}: 8 suallıq mini test`, description: "Seçilmiş fənn, sinif və mövzu üzrə yeni suallar və həll izahları.", href: `/mini-quiz?topic=${encodeURIComponent(topic)}&subject=${encodeURIComponent(subject)}${grade ? `&grade=${grade}` : ""}`, provider: "Kairo AI", language: "az" };
}
export function getResourcesForFocus(topic: string, grade?: Grade, subject: Subject = "Riyaziyyat"): LearningResourceBundle {
  const entry = VERIFIED_RESOURCE_CATALOG.find(e => e.subject === subject && e.matches.test(topic.toLocaleLowerCase("az")) && (!grade || Number(grade) >= (e.minGrade ?? 1)));
  const result: LearningResourceBundle = { test: topicQuizResource(topic, grade, subject) };
  if (entry) {
    result.material = { kind: "material", title: entry.title, description: "Mövzu üzrə əlavə izah. İngilis dilindədir; yerli sinif proqramını əvəz etmir.", href: entry.material, provider: entry.provider, language: "en" };
    if (entry.video) result.video = { kind: "video", title: `${entry.title}: video`, description: "Bu anlayışı izah edən birbaşa video. İngilis dilindədir.", href: entry.video, provider: entry.videoProvider ?? entry.provider, language: "en" };
  }
  return result;
}
export function getLearningResources(topic: string, grade?: Grade, subject: Subject = "Riyaziyyat"): LearningResource[] {
  return Object.values(getResourcesForFocus(topic, grade, subject));
}

export function allowedResourceUrl(raw: string, kind: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    const host = u.hostname.replace(/^www\./, "");
    if (!["khanacademy.org", "en.khanacademy.org", "az.khanacademy.org", "youtube.com", "youtu.be", "tutorial.math.lamar.edu", "usgs.gov", "e-derslik.edu.az", "video.edu.az", "openstax.org"].includes(host)) return null;
    if (kind === "video" && !(u.pathname.includes("/v/") || (host === "youtube.com" && u.pathname === "/watch" && /^[\w-]{11}$/.test(u.searchParams.get("v") ?? "")) || (host === "youtu.be" && /^\/[\w-]{11}$/.test(u.pathname)) || host === "video.edu.az")) return null;
    if (!["youtube.com", "youtu.be"].includes(host) && u.pathname.split("/").filter(Boolean).length < 2) return null;
    if ((host === "youtube.com" && (u.pathname !== "/watch" || !/^[\w-]{11}$/.test(u.searchParams.get("v") ?? ""))) || (host === "youtu.be" && !/^\/[\w-]{11}$/.test(u.pathname))) return null;
    if (/\/search|\/results|\/playlist|\/portal\/index|\/science\/(physics|biology|chemistry)\/?$|\/math\/(algebra|geometry|arithmetic)\/?$/i.test(u.pathname)) return null;
    for (const key of [...u.searchParams.keys()]) if (key.startsWith("utm_")) u.searchParams.delete(key);
    u.hash = ""; return u.toString();
  } catch { return null; }
}
