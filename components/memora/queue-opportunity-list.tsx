import Link from "next/link";

import { StateSticker } from "@/components/memora/state-sticker";
import { followUpOpportunityAnchor } from "@/lib/data/follow-up-builder";
import type { FollowUpOpportunity, FollowUpStatus } from "@/lib/data/follow-up-builder";

interface QueueOpportunityListProps {
  opportunities: FollowUpOpportunity[];
  basePath: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusLabel(status: FollowUpStatus): string {
  return status === "approved" ? "APPROVED" : status === "dismissed" ? "DISMISSED" : status === "posted" ? "POSTED" : "NEEDS REVIEW";
}

function statusTone(status: FollowUpStatus): "remembered" | "open" | "approved" | "complete" {
  return status === "approved" ? "approved" : status === "dismissed" ? "remembered" : status === "posted" ? "complete" : "open";
}

function sourceLabel(opportunity: FollowUpOpportunity): string {
  return opportunity.dataOrigin === "real-youtube"
    ? "REAL YOUTUBE"
    : opportunity.dataOrigin === "real-discord"
      ? "REAL DISCORD"
      : opportunity.dataOrigin === "real-multi-source"
        ? "REAL MULTI-SOURCE"
        : "DEMO FALLBACK";
}

export function QueueOpportunityList({ opportunities, basePath }: QueueOpportunityListProps) {
  return (
    <div className="queue-opportunity-list" aria-label="Available follow-up opportunities">
      {opportunities.map((opportunity) => {
        const anchor = followUpOpportunityAnchor(opportunity.id);
        return (
          <article className="queue-opportunity" key={opportunity.id}>
            <Link className="queue-opportunity__link" href={`${basePath}/follow-up#${anchor}`}>
              <header className="queue-opportunity__header">
                <div>
                  <div className="queue-opportunity__meta">
                    <span className="state-sticker state-sticker--active">{sourceLabel(opportunity)}</span>
                    <span className="data-label">{formatDate(opportunity.creatorEventOccurredAt)}</span>
                  </div>
                  <h2>{opportunity.audienceMemberName} is worth carrying forward.</h2>
                  <p>{opportunity.whyNow}</p>
                </div>
                <StateSticker tone={statusTone(opportunity.status)}>{statusLabel(opportunity.status)}</StateSticker>
              </header>

              <div className="queue-opportunity__thread" aria-label="Opportunity summary">
                <div>
                  <span className="section-label">AUDIENCE MEMORY</span>
                  <p className="queue-opportunity__quote">“{opportunity.commentText}”</p>
                </div>
                <span className="queue-opportunity__thread-line" aria-hidden="true" />
                <div>
                  <span className="section-label">NEW CREATOR EVENT</span>
                  <strong>{opportunity.creatorEventTitle}</strong>
                </div>
              </div>

              <footer className="queue-opportunity__footer">
                <span className="data-label">SOURCE-BACKED / DETAIL REVIEW</span>
                <span className="secondary-link">OPEN FOLLOW-UP REVIEW <span className="secondary-link__arrow" aria-hidden="true">↗</span></span>
              </footer>
            </Link>
          </article>
        );
      })}
    </div>
  );
}
