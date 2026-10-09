import type { AnalysisResult, GamificationState, Question, QuizAnswers, QuizResult, StudyPlan } from "@/lib/types";

export const demoQuestions: Question[] = [
  {
    id: "demo-q1",
    grade: "11",
    subject: "Riyaziyyat",
    topic: "Törəmə",
    difficulty: "medium",
    question: "f(x)=x^3 üçün f'(x) nədir?",
    options: ["3x^2", "x^2", "3x", "x^3"],
    correctIndex: 0,
    explanation: "Qüvvət qaydası: (x^n)' = n*x^(n-1).",
  },
  {
    id: "demo-q2",
    grade: "11",
    subject: "Riyaziyyat",
    topic: "Funksiya",
    difficulty: "easy",
    question: "f(x)=2x+1 funksiyasında x=3 üçün f(x) neçədir?",
    options: ["7", "6", "5", "8"],
    correctIndex: 0,
    explanation: "2*3+1=7.",
  },
  {
    id: "demo-q3",
    grade: "11",
    subject: "Riyaziyyat",
    topic: "Tənliklər",
    difficulty: "medium",
    question: "2x-6=0 tənliyinin həlli neçədir?",
    options: ["2", "3", "4", "6"],
    correctIndex: 1,
    explanation: "2x=6 -> x=3.",
  },
  {
    id: "demo-q4",
    grade: "11",
    subject: "Riyaziyyat",
    topic: "Törəmə",
    difficulty: "hard",
    question: "f(x)=sin(x) üçün f'(x) nədir?",
    options: ["sin(x)", "-sin(x)", "cos(x)", "-cos(x)"],
    correctIndex: 2,
    explanation: "sin(x)-in törəməsi cos(x)-dir.",
  },
];

export const demoAnswers: QuizAnswers = {
  "demo-q1": 2,
  "demo-q2": 0,
  "demo-q3": 1,
  "demo-q4": 0,
};

export const demoResult: QuizResult = {
  grade: "11",
  subject: "Riyaziyyat",
  textbookId: "az-math-11",
  totalQuestions: 4,
  totalCorrect: 2,
  totalWrong: 2,
  overallAccuracy: 50,
  level: "intermediate",
  topicScores: [
    { topic: "Törəmə", correct: 0, total: 2, accuracy: 0 },
    { topic: "Funksiya", correct: 1, total: 1, accuracy: 100 },
    { topic: "Tənliklər", correct: 1, total: 1, accuracy: 100 },
  ],
  strongestTopic: "Funksiya",
  weakestTopic: "Törəmə",
  weakTopics: ["Törəmə"],
  errorPatterns: ["Qaydanı bilsən də tətbiqdə səhv edirsən", "Vaxt baskısı ilə diqqət itkisi"],
  predictedScore: 420,
  potentialScore: 560,
  recommendedNextQuiz: "Törəmə qaydalarının tətbiqi",
  submittedAt: new Date().toISOString(),
};

export const demoAnalysis: AnalysisResult = {
  weakTopics: ["Törəmə", "Limit"],
  strongTopics: ["Funksiya", "Tənliklər"],
  feedback:
    "Sənin əsas zəifliyin törəmə qaydalarını məsələdə tətbiq etməkdir. Güclü tərəfin isə funksiyalar və tənliklərdə sabitlikdir.",
  nextStep: "Növbəti 2 gün törəmə üzrə qısa qayda təkrarı və hədəfli test bloku et.",
};

export const demoPlan: StudyPlan = {
  title: "AI Dynamic Study Plan",
  summary: "Bu plan zəif mövzular və son performans əsasında yaradılıb.",
  days: [
    {
      day: 1,
      focus: "Törəmə qaydaları",
      estimatedMinutes: 60,
      tasks: ["10 dəq qayda təkrarı", "12 sual törəmə praktikası", "Səhvlərin səbəbini yaz"],
    },
    {
      day: 2,
      focus: "Törəmə tətbiqi",
      estimatedMinutes: 70,
      tasks: ["Keçmiş səhvləri yenidən həll et", "15 qarışıq sual", "2 dəqiqəlik öz-izah"],
    },
    {
      day: 3,
      focus: "Limit və törəmə əlaqəsi",
      estimatedMinutes: 65,
      tasks: ["Nəzəri bağlantı oxu", "10 sual", "Mini quiz"],
    },
  ],
  tips: ["Qısa bloklarla çalış", "Səhvləri səbəblə qeyd et", "Hər gün mini yoxlama et"],
};

export const demoGamification: GamificationState = {
  xp: 120,
  streak: 2,
  level: 2,
  dailyProgress: 40,
};
