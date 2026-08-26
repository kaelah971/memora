import type { ReactNode } from "react";

import { classNames } from "@/lib/class-names";

interface ProofPanelProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  titleId?: string;
  className?: string;
}

export function ProofPanel({ children, eyebrow, title, titleId, className }: ProofPanelProps) {
  return (
    <section className={classNames("proof-panel", className)}>
      <span className="section-label proof-panel__eyebrow">{eyebrow}</span>
      <h2 id={titleId}>{title}</h2>
      <div className="proof-panel__content">{children}</div>
    </section>
  );
}
