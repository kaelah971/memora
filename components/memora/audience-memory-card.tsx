import type { DemoAudienceMember } from "@/types/memora";

import { classNames } from "@/lib/class-names";
import { SecondaryLink } from "@/components/memora/secondary-link";
import { StateSticker } from "@/components/memora/state-sticker";

interface AudienceMemoryCardProps {
  member: DemoAudienceMember;
  className?: string;
}

export function AudienceMemoryCard({ member, className }: AudienceMemoryCardProps) {
  return (
    <article className={classNames("audience-memory-card", className)}>
      <header className="audience-memory-card__header">
        <div>
          <span className="section-label">AUDIENCE MEMORY</span>
          <h3>{member.name}</h3>
          <p>{member.descriptor}</p>
        </div>
        <StateSticker tone={member.status}>
          {member.status === "ready" ? "FOLLOW-UP READY" : member.status.replace("-", " ").toUpperCase()}
        </StateSticker>
      </header>
      <div className="audience-memory-card__facts">
        <span className="data-label">{member.sourceCount}</span>
        {member.facts.map((fact) => (
          <span className="fact-chip" key={fact}>
            {fact}
          </span>
        ))}
      </div>
      <blockquote className="audience-memory-card__quote">
        &ldquo;{member.primaryInteraction.quote}&rdquo;
      </blockquote>
      <div className="audience-memory-card__details">
        <div>
          <span className="data-label">OPEN LOOP</span>
          <p>{member.openLoop ?? "No open question recorded"}</p>
        </div>
        <div>
          <span className="data-label">NEXT ACTION</span>
          <p>{member.nextAction ?? "Keep in context"}</p>
        </div>
      </div>
      <footer className="audience-memory-card__footer">
        <SecondaryLink href="#memory">See why</SecondaryLink>
        <span className="data-label">SOURCE VISIBLE</span>
      </footer>
    </article>
  );
}
