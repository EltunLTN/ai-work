import { Progress } from "@/components/ui/progress";
import { useLocale } from "@/hooks/use-locale";

export function QuizProgress({ answered, total }: { answered: number; total: number }) {
  const { t } = useLocale();
  const value = total ? (answered / total) * 100 : 0;

  return (
    <div className="kairo-card rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-zinc-400">
        <span>{t.quiz.progress}</span>
        <span>
          {answered}/{total}
        </span>
      </div>
      <Progress value={value} />
    </div>
  );
}
