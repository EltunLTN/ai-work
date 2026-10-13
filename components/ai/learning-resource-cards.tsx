import { BookOpen, ExternalLink, FlaskConical, PlayCircle } from "lucide-react";
import type { LearningResource } from "@/lib/types";

export function LearningResourceCards({ resources, compact = false }: { resources: LearningResource[]; compact?: boolean }) {
  return (
    <div className={compact ? "mt-3 space-y-2" : "grid gap-4 md:grid-cols-3"}>
      {resources.map((resource) => {
        const Icon = resource.kind === "test" ? FlaskConical : resource.kind === "video" ? PlayCircle : BookOpen;
        const external = resource.href.startsWith("https://");
        return (
          <a key={`${resource.kind}:${resource.href}`} href={resource.href}
            target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}
            className={`kairo-card block rounded-2xl transition hover:border-red-400/50 ${compact ? "p-3" : "p-4"}`}>
            <div className="flex items-center justify-between gap-2">
              <Icon className="h-4 w-4 shrink-0 text-red-400" />
              <span className="kairo-muted text-[11px]">{resource.provider} · {resource.language === "az" ? "AZ" : "EN"}</span>
              {external ? <ExternalLink className="kairo-muted h-3 w-3 shrink-0" /> : null}
            </div>
            <p className="mt-2 text-sm font-semibold">{resource.title}</p>
            {!compact ? <p className="kairo-muted mt-1 text-xs">{resource.description}</p> : null}
          </a>
        );
      })}
    </div>
  );
}
