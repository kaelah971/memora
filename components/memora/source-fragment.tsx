import type { DemoInteraction } from "@/types/memora";

import { classNames } from "@/lib/class-names";

interface SourceFragmentProps {
  interaction: DemoInteraction;
  className?: string;
  polaroid?: boolean;
}

export function SourceFragment({
  interaction,
  className,
  polaroid = false,
}: SourceFragmentProps) {
  return (
    <article className={classNames("source-fragment", polaroid && "source-fragment--polaroid", className)}>
      <div className="source-fragment__tape" aria-hidden="true" />
      <header className="source-fragment__header">
        <span className="data-label">{interaction.platform}</span>
        <time className="data-label" dateTime={interaction.isoDate}>
          {interaction.date} / {interaction.timestamp}
        </time>
      </header>
      <blockquote className="source-fragment__quote">&ldquo;{interaction.quote}&rdquo;</blockquote>
      <p className="source-fragment__context">{interaction.context}</p>
      <footer className="source-fragment__footer">
        <span>Source moment</span>
        <span className="data-label">{interaction.id}</span>
      </footer>
    </article>
  );
}
