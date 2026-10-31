import type { ReactNode } from "react";
export function WorkspaceHeading({ index, title, description, children }: { index: string; title: string; description?: string; children?: ReactNode }) {
  return <div className="workspace-heading"><div><p className="mono-label">KAİRO / {index}</p><h1>{title}</h1>{description && <p className="workspace-description">{description}</p>}</div>{children}</div>;
}
