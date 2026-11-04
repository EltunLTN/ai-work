export type Answer = string | number | number[] | Record<string, string> | null;
export type QuestionType =
  | "single"
  | "multiple"
  | "numeric"
  | "short"
  | "matching"
  | "written"
  | "passage"
  | "image";
export interface BankQuestion {
  id: string;
  subject: string;
  grade: number;
  topic: string;
  difficulty: string;
  type: QuestionType;
  ordinal: number;
  points: number;
  body: {
    statement: string;
    options?: string[];
    left?: string[];
    right?: string[];
    passage?: string;
    image_url?: string;
    image_alt?: string;
  };
  key?: { answer?: Answer; answers?: string[]; rubric?: string };
  explanation?: string;
  correct?: boolean | null;
  written_review?: { score: number | null; feedback: string };
}
export interface ExamTemplate {
  practice_mode?: "class"|"mixed";
  id: string;
  name: string;
  version: number;
  year: number;
  exam_type: string;
  admission_group: string | null;
  grade: number;
  duration_seconds: number;
  max_score: number;
  scale: string;
  official_format: boolean;
  source_url: string | null;
  source_published: string | null;
  verified_at: string | null;
  status: string;
  sections: Array<{
    subject: string;
    count: number;
    types: QuestionType[];
    weight?: number;
  }>;
  rules: {
    instructions?: string;
    calculator?: boolean;
    scoring_reference?: string;
    verified?: boolean;
    authorized_content?: boolean;
  };
}
export interface ExamResult {
  session_id: string;
  total: number;
  correct: number;
  unanswered: number;
  earned: number;
  maximum: number;
  pending: number;
  status: "provisional" | "final";
  subjects: Array<{
    grade?: string;
    subject: string;
    total: number;
    correct: number;
    earned: number;
    maximum: number;
  }>;
  topics: Array<{
    subject: string;
    topic: string;
    total: number;
    correct: number;
    earned: number;
    maximum: number;
  }>;
}
export interface SavedAnswer {
  ordinal: number;
  value: Answer;
  marked: boolean;
  revision: number;
}
export interface ExamState {
  id: string;
  template: ExamTemplate;
  mode: "exam" | "arena";
  status: string;
  started_at: string;
  deadline: string;
  submitted_at: string | null;
  server_now: string;
  current_index: number;
  can_reveal: boolean;
  questions: BankQuestion[];
  answers: SavedAnswer[];
  result: ExamResult | null;
}
export interface PublicPlayer {
  id: string;
  nickname: string;
  color: string;
  avatar: string | null;
  me?: boolean;
  seat?: number;
  ready?: boolean;
  online?: boolean;
  answered?: boolean;
  score?: number;
  correct?: number;
  average_ms?: number;
}
export interface CompetitionProfile {
  public_id: string;
  nickname: string;
  avatar_color: string;
  consent_public: boolean;
}
export interface DuelSettings {
  subject: string;
  grade: number;
  count: number;
  seconds: number;
  difficulty: string;
  topic: string;
}
export interface DuelState {
  id: string;
  token?: string;
  status: string;
  settings: DuelSettings;
  round: number;
  server_now: string;
  round_started: string | null;
  deadline: string | null;
  reveal_until: string | null;
  tournament_id: string | null;
  winner: PublicPlayer | null;
  players: PublicPlayer[];
  question: BankQuestion | null;
  my_answer: Answer;
  round_review: {
    key: BankQuestion["key"];
    explanation: string;
    my_answer: Answer;
  } | null;
  review: Array<{
    question: BankQuestion;
    key: BankQuestion["key"];
    explanation?: string;
    my_answer: Answer;
    correct: boolean;
    points: number;
    base: number;
    bonus: number;
    duration_ms: number | null;
  }> | null;
}
export interface FocusSettings {
  focus: number;
  short_break: number;
  long_break: number;
  rounds: number;
  auto_break: boolean;
  sound: boolean;
  daily_goal: number;
}
export interface FocusSession {
  id: string;
  subject: string;
  task: string;
  return_path: string;
  settings: FocusSettings;
  status: string;
  phase: "focus" | "break";
  round: number;
  phase_seconds: number;
  phase_credited: number;
  focused_seconds: number;
  break_seconds: number;
  completed_rounds: number;
  last_seen: string;
  deadline: string;
  started_at: string;
  ended_at: string | null;
}
export interface FocusState {
  server_now: string;
  active: FocusSession | null;
  preferences: FocusSettings;
  today: number;
  week: Array<{ day: string; seconds: number; rounds: number }>;
  history: FocusSession[];
}
export interface TutorSession {
  id: string;
  subject: string;
  grade: number;
  topic: string;
  mode: "socratic" | "explain" | "practice";
  hint_level: number;
  hint_count: number;
  attempts: number;
  solution_revealed: boolean;
  solved_verified: boolean;
  status: string;
  question_context: { statement?: string };
  updated_at: string;
}
export interface TutorMessage {
  id: string;
  request_id: string;
  role: "user" | "assistant";
  content: string;
  action: string;
  status: string;
  created_at: string;
}
export interface TutorState {
  limits?: { max_hints: number; max_turns: number };
  session: TutorSession;
  messages: TutorMessage[];
}
export interface Program {
  source_status?: "official"|"secondary"|"preliminary";
  cutoff_status?: "verified"|"reported"|"unknown";
  reported_cutoff?: string|null;
  reported_state_cutoff?: string|null;
  id: string;
  university_id: string;
  university: string;
  code: string | null;
  name: string;
  admission_group: string | null;
  language: string;
  study_format: string;
  year: number;
  cutoff: number | null;
  state_cutoff: number | null;
  minimum_requirement: string | null;
  source_url: string;
  source_published: string | null;
  verified_at: string;
}
export interface UniversityGoal {
  id: string;
  program: Program;
  university: string;
  target_score: number;
  admission_year: number;
  funding: string;
  is_primary: boolean;
}
export interface MockPoint {
  id: string;
  started_at: string;
  name: string;
  scale: string;
  official_format: string | boolean;
  earned: number;
  maximum: number;
}
export interface GoalState {
  universities: Array<{ id: string; name: string }>;
  programs: Program[];
  goals: UniversityGoal[];
  mock_history: MockPoint[];
  priorities: Array<{
    subject: string;
    grade?: string;
    topic: string;
    total: number;
    correct: number;
  }>;
}
export interface Tournament {
  id: string;
  name: string;
  mode: "async" | "knockout";
  subject: string;
  grade: number;
  question_count: number;
  time_per_question: number;
  registration_opens: string;
  registration_closes: string;
  starts_at: string;
  ends_at: string;
  status: string;
  max_participants: number;
  participants?: number;
  registered?: boolean;
  champion: PublicPlayer | null;
  rules: Record<string, unknown>;
}
export interface ArenaState {
  tournament: Tournament;
  registered: boolean;
  leaderboard: Array<{
    rank: number;
    player: PublicPlayer;
    me: boolean;
    score: number;
    maximum: number;
    correct: number;
    total: number;
    elapsed_seconds: number;
    finished_at: string;
  }>;
  my_entry: { session_id: string; disqualified: boolean; note: string } | null;
  bracket: Array<{
    round: number;
    slot: number;
    a: PublicPlayer | null;
    b: PublicPlayer | null;
    winner: PublicPlayer | null;
    status: string;
    my_match: string | null;
  }>;
}

