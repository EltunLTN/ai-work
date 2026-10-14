export type Grade = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11";

export type Subject = "Riyaziyyat" | "Fizika" | "Biologiya" | "Coğrafiya" | "Kimya";

export type Topic = string;

export type Difficulty = "easy" | "medium" | "hard";

export type StudentLevel = "beginner" | "intermediate" | "advanced";

export interface TextbookReference {
  id: string;
  grade: Grade;
  subject: Subject;
  title: string;
  sourceLabel: string;
  sourceUrl?: string;
  topics: string[];
}

export interface StudentProfile {
  grade: Grade;
  subject: Subject;
  textbookId: string;
  selectedTopics: string[];
}

export interface LearningStage {
  id: string;
  title: string;
  description: string;
  minAccuracyToPass: number;
}

export interface Question {
  id: string;
  grade: Grade;
  subject: Subject;
  topic: Topic;
  difficulty: Difficulty;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedIndex: number;
}

export interface TopicScore {
  topic: Topic;
  correct: number;
  total: number;
  accuracy: number;
}

export interface DiagnosticResult {
  grade: Grade;
  subject: Subject;
  textbookId: string;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  overallAccuracy: number;
  level: StudentLevel;
  topicScores: TopicScore[];
  strongestTopic: string;
  weakestTopic: string;
  weakTopics: string[];
  errorPatterns: string[];
  predictedScore: number;
  potentialScore: number;
  recommendedNextQuiz: string;
  submittedAt: string;
}

export type QuizResult = DiagnosticResult;

export interface StudyPlanDay {
  day: number;
  topic?: Topic;
  focus: string;
  tasks: string[];
  estimatedMinutes: number;
  checkpoint?: boolean;
  resources?: LearningResource[];
}

export interface LearningResource {
  title: string;
  description: string;
  href: string;
  provider: string;
  language: "az" | "en";
  kind: "material" | "video" | "test";
}

export interface StudyPlan {
  title: string;
  summary: string;
  days: StudyPlanDay[];
  tips: string[];
  generatedAt?: string;
  resultSubmittedAt?: string;
  version?: number;
  dailyMinutes?: number;
}

export interface FeedbackSummary {
  headline: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  nextStep: string;
}

export interface AnalysisResult {
  weakTopics: string[];
  strongTopics: string[];
  feedback: string;
  nextStep: string;
}

export interface GamificationState {
  xp: number;
  streak: number;
  level: number;
  dailyProgress: number;
  lastActivityDate?: string;
  processedResultIds?: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TutorContext {
  grade?: Grade;
  subject?: Subject;
  topics: string[];
  result?: Pick<DiagnosticResult, "totalQuestions" | "totalCorrect" | "topicScores" | "submittedAt">;
  plan?: Pick<StudyPlan, "title" | "days">;
}

export type GeneratedFeedback = FeedbackSummary;

export interface QuizAnswers {
  [questionId: string]: number;
}
