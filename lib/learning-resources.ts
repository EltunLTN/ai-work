export interface LearningResourceBundle {
  material: { title: string; description: string; href: string };
  test: { title: string; description: string; href: string };
  video: { title: string; description: string; href: string };
}

function buildMaterialLink(topic: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(`${topic} konspekt`)}`;
}

function buildVideoLink(topic: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${topic} izahlı video`)}`;
}

function buildMiniQuizLink(topic: string) {
  return `/mini-quiz?topic=${encodeURIComponent(topic)}`;
}

const defaultBundle: LearningResourceBundle = {
  material: {
    title: "Mövzu konspekti",
    description: "Əsas anlayışlar və qaydalar üzrə qısa oxu materialı.",
    href: buildMaterialLink("DİM mövzusu"),
  },
  test: {
    title: "Mövzu mini test",
    description: "12 suallıq zamanlı yoxlama ilə möhkəmləndirmə.",
    href: buildMiniQuizLink("Ümumi mövzu"),
  },
  video: {
    title: "İzahlı video",
    description: "Mövzunun addım-addım izahı və nümunə suallar.",
    href: buildVideoLink("DİM mövzusu"),
  },
};

const bundles: Record<string, LearningResourceBundle> = {
  faiz: {
    material: {
      title: "Faiz qaydaları xəritəsi",
      description: "Faiz çevirmə, artım-azalma və tətbiq nümunələri.",
      href: buildMaterialLink("faiz"),
    },
    test: {
      title: "Faiz üzrə 20 sual",
      description: "Müxtəlif çətinlikdə DİM tipli faiz sualları.",
      href: buildMiniQuizLink("faiz"),
    },
    video: {
      title: "Faiz mövzusu video izah",
      description: "Sürətli metod və tipik səhvlərin izahı.",
      href: buildVideoLink("faiz"),
    },
  },
  "mürəkkəb cümlə": {
    material: {
      title: "Mürəkkəb cümlə sxemi",
      description: "Bağlayıcılar, cümlə əlaqələri və struktur analizi.",
      href: buildMaterialLink("mürəkkəb cümlə"),
    },
    test: {
      title: "Sintaksis mini test",
      description: "Mürəkkəb cümlə və punktuasiya üzrə 15 sual.",
      href: buildMiniQuizLink("mürəkkəb cümlə"),
    },
    video: {
      title: "Sintaksis video izah",
      description: "Nümunə cümlələrlə izahlı təhlil.",
      href: buildVideoLink("mürəkkəb cümlə"),
    },
  },
  ardıcıllıq: {
    material: {
      title: "Ardıcıllıq strategiya qeydləri",
      description: "Riyazi və məntiqi ardıcıllıq tapşırıqları üçün yol xəritəsi.",
      href: buildMaterialLink("ardıcıllıq"),
    },
    test: {
      title: "Ardıcıllıq test paketi",
      description: "Səviyyəyə uyğun 3 hissəli adaptiv test.",
      href: buildMiniQuizLink("ardıcıllıq"),
    },
    video: {
      title: "Ardıcıllıq video məşq",
      description: "Sürətli həll texnikaları ilə izah.",
      href: buildVideoLink("ardıcıllıq"),
    },
  },
};

export function getResourcesForFocus(focus: string): LearningResourceBundle {
  const key = focus.toLowerCase();
  const found = Object.entries(bundles).find(([k]) => key.includes(k));

  const base = found ? found[1] : defaultBundle;
  return {
    material: {
      ...base.material,
      href: buildMaterialLink(focus),
    },
    test: {
      ...base.test,
      href: buildMiniQuizLink(focus),
    },
    video: {
      ...base.video,
      href: buildVideoLink(focus),
    },
  };
}
