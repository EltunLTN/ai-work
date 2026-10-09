import type {
  FeedbackSummary,
  Grade,
  Question,
  StudentLevel,
  StudyPlan,
  Subject,
  Topic,
} from "@/lib/types";

export const SUBJECTS: Subject[] = ["Riyaziyyat"];

const FALLBACK_BANK: Array<Omit<Question, "grade" | "subject"> & { subject: Subject }> = [
  {
    id: "fb-1",
    subject: "Riyaziyyat",
    topic: "Kəsrlər",
    difficulty: "easy",
    question: "3/4 və 1/4 cəmi neçədir?",
    options: ["1", "3/8", "2", "4/4"],
    correctIndex: 0,
    explanation: "Eyni məxrəc olduqda surətlər toplanır: 3/4+1/4=1.",
  },
  {
    id: "fb-2",
    subject: "Riyaziyyat",
    topic: "Faiz",
    difficulty: "medium",
    question: "200 ədədin 15%-i neçədir?",
    options: ["20", "25", "30", "35"],
    correctIndex: 2,
    explanation: "200*0.15=30.",
  },
  {
    id: "fb-3",
    subject: "Riyaziyyat",
    topic: "Sadə tənliklər",
    difficulty: "medium",
    question: "x + 7 = 19 olduqda x neçədir?",
    options: ["10", "11", "12", "13"],
    correctIndex: 2,
    explanation: "x=19-7=12.",
  },
  {
    id: "fb-4",
    subject: "Riyaziyyat",
    topic: "Nisbət və tənasüb",
    difficulty: "medium",
    question: "2:3 = x:12 olduqda x neçədir?",
    options: ["6", "7", "8", "9"],
    correctIndex: 2,
    explanation: "2/3 = x/12 => x = 8.",
  },
  {
    id: "fb-5",
    subject: "Riyaziyyat",
    topic: "Kvadrat tənliklər",
    difficulty: "hard",
    question: "x^2 - 5x + 6 = 0 tənliyinin kökləri hansılardır?",
    options: ["1 və 6", "2 və 3", "-2 və -3", "0 və 6"],
    correctIndex: 1,
    explanation: "(x-2)(x-3)=0 => x=2 və x=3.",
  },
  {
    id: "fb-6",
    subject: "Riyaziyyat",
    topic: "Triqonometriya",
    difficulty: "medium",
    question: "sin 30° neçədir?",
    options: ["1/2", "sqrt(2)/2", "sqrt(3)/2", "1"],
    correctIndex: 0,
    explanation: "sin 30° = 1/2.",
  },
];

function hash(text: string): number {
  return text.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function randomInt(min: number, max: number, seed: number): number {
  const value = Math.abs(Math.sin(seed) * 10000);
  return Math.floor(value % (max - min + 1)) + min;
}

function buildTopicQuestion(input: {
  grade: Grade;
  subject: Subject;
  topic: string;
  index: number;
}): Question {
  const seed = Date.now() + hash(input.topic) + input.index * 13;

  const a = randomInt(4, 30, seed);
  const b = randomInt(2, 12, seed + 1);
  const operationType = input.index % 3;
  const correct = operationType === 0 ? a + b : operationType === 1 ? a - b : a * b;
  const options = [correct, correct + 2, correct - 1, correct + 4]
    .map(String)
    .sort(() => 0.5 - Math.random());
  const correctIndex = options.findIndex((item) => Number(item) === correct);

  return {
    id: `fb-topic-${input.index}`,
    grade: input.grade,
    subject: input.subject,
    topic: input.topic,
    difficulty: input.index % 3 === 0 ? "hard" : "medium",
    question:
      operationType === 0
        ? `${input.topic} mövzusunda: ${a} + ${b} nəticəsini tapın.`
        : operationType === 1
          ? `${input.topic} mövzusunda: ${a} - ${b} nəticəsini tapın.`
          : `${input.topic} mövzusunda: ${a} × ${b} nəticəsini tapın.`,
    options,
    correctIndex,
    explanation: `Düzgün cavab ${correct}-dir.`,
  };
}

export function getFallbackQuestions(input: {
  grade: Grade;
  subject: Subject;
  topics: string[];
  count?: number;
}): Question[] {
  const count = input.count ?? 8;
  const topicPool = input.topics.length ? input.topics : ["Ümumi mövzu"];

  const topicDriven = Array.from({ length: count }).map((_, index) =>
    buildTopicQuestion({
      grade: input.grade,
      subject: input.subject,
      topic: topicPool[index % topicPool.length],
      index,
    }),
  );

  const bySubject = FALLBACK_BANK.filter((item) => item.subject === input.subject);
  const byTopics = bySubject.filter((item) => input.topics.includes(item.topic));
  const source = byTopics.length >= count ? byTopics : bySubject;

  return Array.from({ length: count }).map((_, index) => {
    if (index < topicDriven.length) {
      return topicDriven[index];
    }
    const base = source[index % source.length] ?? bySubject[index % bySubject.length];
    return {
      id: `${base.id}-${index + 1}`,
      grade: input.grade,
      subject: input.subject,
      topic: base.topic,
      difficulty: base.difficulty,
      question: base.question,
      options: base.options,
      correctIndex: base.correctIndex,
      explanation: base.explanation,
    };
  });
}

export function getAdaptiveFallbackQuestions(input: {
  grade: Grade;
  subject: Subject;
  weakTopics: Topic[];
  level: StudentLevel;
  count?: number;
}): Question[] {
  const count = input.count ?? 4;
  const topics = input.weakTopics.length ? input.weakTopics : ["Faiz", "Kəsrlər", "Tənliklər"];
  const questions = getFallbackQuestions({
    grade: input.grade,
    subject: input.subject,
    topics,
    count,
  });

  return questions.map((q, idx) => ({
    ...q,
    id: `${q.id}-a${idx}`,
    difficulty: input.level === "beginner" ? "easy" : input.level === "advanced" ? "hard" : "medium",
  }));
}

export const FALLBACK_FEEDBACK: FeedbackSummary = {
  headline: "Səviyyən sabitdir, indi fokuslu yüksəliş vaxtıdır.",
  summary:
    "Mövzu üzrə potensial görünür. Zəif mövzularda qısa, ardıcıl bloklarla nəticəni sürətlə yüksəltmək mümkündür.",
  strengths: ["Əsas suallarda dəqiqlik var", "Sınaq ritmini qoruya bilirsən"],
  weaknesses: ["Zəif mövzularda səhv təkrarlanır", "Çətin suallarda seçim strategiyası zəifləyir"],
  nextStep: "Ən zəif 2 mövzudan 20+20 dəqiqəlik blok et və sonunda mini test həll et.",
};

export const FALLBACK_STUDY_PLAN: StudyPlan = {
  title: "7 günlük fərdi inkişaf planı",
  summary: "Plan zəif mövzuları prioritetləşdirir, gündəlik qısa tapşırıqlarla sabit artımı hədəfləyir.",
  days: [
    { day: 1, focus: "Zəif mövzu əsasları", tasks: ["Qısa təkrar", "10 test", "Səhv qeydi"], estimatedMinutes: 60 },
    { day: 2, focus: "Hesablama sürəti və dəqiqlik", tasks: ["15 dəq qayda", "15 dəq sual", "20 dəq izah"], estimatedMinutes: 55 },
    { day: 3, focus: "Qarışıq mini sınaq", tasks: ["20 sual", "Analiz", "Düzəliş"], estimatedMinutes: 65 },
    { day: 4, focus: "Zəif mövzu dərinləşmə", tasks: ["Nümunə suallar", "İzah yaz", "Yekun blok"], estimatedMinutes: 70 },
    { day: 5, focus: "Adaptiv məşq", tasks: ["AI sual seti", "Səhv pattern", "Yenidən həll"], estimatedMinutes: 60 },
    { day: 6, focus: "Zamanlı test", tasks: ["30 dəq test", "20 dəq təhlil", "Qısa təkrar"], estimatedMinutes: 70 },
    { day: 7, focus: "Yekun konsolidasiya", tasks: ["Prioritet mövzu", "Mini imtahan", "Növbəti həftə planı"], estimatedMinutes: 60 },
  ],
  tips: [
    "Hər gün 5 dəqiqə səhv səbəblərini yaz.",
    "Eyni anda maksimum 2 prioritet mövzu seç.",
    "Sınaqdan əvvəl qısa qayda baxışı et.",
  ],
};
