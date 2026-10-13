import type { Grade, LearningResource } from "@/lib/types";

export interface LearningResourceBundle {
  material: LearningResource;
  test: LearningResource;
  video: LearningResource;
}

// Curated direct destinations. The model never creates external URLs.
// Reviewed 2026-10-13; English resources are explicitly labelled in the UI.
const catalog = [
  {
    matches: /inteqral/iu,
    title: "İnteqral və ibtidai funksiya",
    material: "https://tutorial.math.lamar.edu/Classes/CalcI/IndefiniteIntegrals.aspx",
    provider: "Paul’s Online Math Notes",
    video: "https://www.youtube.com/watch?v=rfG8ce4nNh0",
    videoTitle: "İnteqralın mənası və analizin əsas teoremi",
    videoProvider: "3Blue1Brown",
  },
  {
    matches: /törəmə/iu,
    title: "Törəmə qaydaları və tətbiqləri",
    material: "https://tutorial.math.lamar.edu/Classes/CalcI/DerivativeIntro.aspx",
    provider: "Paul’s Online Math Notes",
    video: "https://www.khanacademy.org/math/calculus-1",
    videoTitle: "Törəmə üzrə video dərslər toplusu",
  },
  {
    matches: /triqonom/iu,
    title: "Triqonometriya dərsləri",
    material: "https://www.khanacademy.org/math/trigonometry",
    video: "https://www.khanacademy.org/math/trigonometry",
  },
  {
    matches: /loqarifm|eksponent/iu,
    title: "Loqarifm və eksponent funksiyalar",
    material: "https://tutorial.math.lamar.edu/Classes/Alg/ExpAndLog.aspx",
    provider: "Paul’s Online Math Notes",
    video: "https://www.khanacademy.org/math/algebra2",
    videoTitle: "Cəbr 2: eksponent və loqarifm video dərsləri",
  },
  {
    matches: /ehtimal|statistik|verilən|kombinator/iu,
    title: "Ehtimal və statistika dərsləri",
    material: "https://www.khanacademy.org/math/statistics-probability",
    video: "https://www.khanacademy.org/math/statistics-probability",
  },
  {
    matches: /həndəs|fiqur|bucaq|sahə|həcm|perimetr|stereometr|vektor|məkan/iu,
    title: "Həndəsə dərsləri",
    material: "https://www.khanacademy.org/math/geometry",
    video: "https://www.khanacademy.org/math/geometry",
  },
  {
    matches: /kəsr/iu,
    title: "Kəsrlər üzrə dərslər",
    material: "https://www.khanacademy.org/math/arithmetic/fraction-arithmetic",
    video: "https://www.youtube.com/watch?v=jgWqSjgMAtw",
    videoTitle: "Kəsr anlayışına giriş",
  },
  {
    matches: /faiz|nisbət|propors|tənasüb|miqyas/iu,
    title: "Faiz, nisbət və tənasüb dərsləri",
    material: "https://www.khanacademy.org/math/pre-algebra",
    video: "https://www.khanacademy.org/math/pre-algebra",
  },
  {
    matches: /tənlik|funksiya|cəbri|bərabərsizlik|kvadrat|irrasional|silsilə/iu,
    title: "Cəbr: ifadələr, tənliklər və funksiyalar",
    material: "https://www.khanacademy.org/math/algebra",
    video: "https://www.khanacademy.org/math/algebra",
  },
];

export function getResourcesForFocus(topic: string, grade?: Grade): LearningResourceBundle {
  const entry = catalog.find((item) => item.matches.test(topic.toLocaleLowerCase("az")));
  const fallbackHref = Number(grade ?? 1) <= 5
    ? "https://www.khanacademy.org/math/arithmetic"
    : "https://www.khanacademy.org/math/algebra";
  const material: LearningResource = {
    kind: "material",
    title: entry?.title ?? "Riyaziyyat dərsləri toplusu",
    description: entry ? "Mövzu üzrə dərs və həll nümunələri." : "Ümumi əlavə mənbə; mövzuya aid bölməni seç.",
    href: entry?.material ?? fallbackHref,
    provider: entry?.provider ?? "Khan Academy",
    language: "en",
  };
  return {
    material,
    video: {
      kind: "video",
      title: entry?.videoTitle ?? `${entry?.title ?? "Riyaziyyat"}: video dərslər`,
      description: "Birbaşa video və ya video dərslərin mövzu səhifəsi.",
      href: entry?.video ?? fallbackHref,
      provider: entry?.videoProvider ?? "Khan Academy",
      language: "en",
    },
    test: {
      kind: "test",
      title: `${topic}: 8 suallıq AI mini test`,
      description: "Seçilmiş sinif və mövzu üzrə yeni suallar, nəticə və həll izahları.",
      href: `/mini-quiz?topic=${encodeURIComponent(topic)}`,
      provider: "Kairo AI",
      language: "az",
    },
  };
}

export function getLearningResources(topic: string, grade?: Grade): LearningResource[] {
  return Object.values(getResourcesForFocus(topic, grade));
}
