import type { DiagnosticResult, LearningStage } from "@/lib/types";

export const LEARNING_STAGES: LearningStage[] = [
  {
    id: "foundation",
    title: "Foundation",
    description: "Əsas anlayışları təmizlə və sadə testlərlə sabitlik qur.",
    minAccuracyToPass: 45,
  },
  {
    id: "core-practice",
    title: "Core Practice",
    description: "Zəif mövzularda intensiv bloklar və zamanlı məşq.",
    minAccuracyToPass: 65,
  },
  {
    id: "exam-sim",
    title: "Exam Simulation",
    description: "Qarışıq çətinlikdə simulyasiya və strategiya optimizasiyası.",
    minAccuracyToPass: 80,
  },
];

export function getLearningPath(result: DiagnosticResult) {
  return LEARNING_STAGES.map((stage, index) => {
    const prev = LEARNING_STAGES[index - 1];
    const unlocked = !prev || result.overallAccuracy >= prev.minAccuracyToPass;
    const completed = result.overallAccuracy >= stage.minAccuracyToPass;
    return {
      ...stage,
      unlocked,
      completed,
      checkpointMessage: completed
        ? "Checkpoint keçildi, növbəti mərhələyə keç"
        : `Bu mərhələni keçmək üçün ən azı ${stage.minAccuracyToPass}% lazımdır`,
    };
  });
}

export function getNextLearningAction(result: DiagnosticResult) {
  const current = getLearningPath(result).find((stage) => stage.unlocked && !stage.completed);
  if (!current) {
    return "Bütün mərhələlər açılıb. İndi tam DİM simulyasiyasına keç.";
  }
  return `${current.title}: ${current.description}`;
}
