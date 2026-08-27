import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { listAudienceMembers } from "@/lib/data/audience-members";
import { getCreatorWorkspace } from "@/lib/data/creators";
import type { Json } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

function platformLabel(platform: string): string {
  return platform === "youtube_live" ? "YouTube Live" : platform === "youtube" ? "YouTube" : platform === "discord" ? "Discord" : platform;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function isOnboardingInteraction(metadata: Json): boolean {
  return typeof metadata === "object" && metadata !== null && !Array.isArray(metadata) && typeof metadata.onboarding_receipt_id === "string";
}

export default async function MemoryPage() {
  const creatorResult = await getCreatorWorkspace();
  const historyResult = creatorResult.data
    ? await listAudienceMembers(creatorResult.data.id)
    : null;

  return (
    <AppScreen
      eyebrow="MEMORA / MEMORY"
      title="Audience history"
      description="Factual source history from the deterministic database. Semantic relationship memory comes later."
      status="DATABASE STATE / P1"
    >
      {!creatorResult.access.available ? (
        <DataSetupState reason={creatorResult.error ?? "Supabase data access is not configured."} />
      ) : !creatorResult.data ? (
        <ProductEmptyState
          eyebrow="NO DEMO CREATOR"
          title="No audience history exists yet."
          description="Run the idempotent database seed command to create factual source history."
        />
      ) : historyResult && !historyResult.access.available ? (
        <DataSetupState reason={historyResult.error ?? "Audience history could not be loaded."} />
      ) : historyResult?.error ? (
        <DataSetupState reason={historyResult.error} />
      ) : historyResult?.data.length === 0 ? (
        <ProductEmptyState
          eyebrow="NO AUDIENCE MEMORY"
          title="No audience memory yet."
          description="Connect YouTube or Discord to import source-backed moments."
          href="/app/import"
          actionLabel="Connect a source"
        />
      ) : (
        <section className="audience-history" aria-labelledby="audience-history-title">
          <div className="audience-history__heading">
            <div>
              <span className="section-label">SOURCE-BACKED PEOPLE</span>
              <h2 id="audience-history-title">Audience history, not Mind-generated cards.</h2>
            </div>
            <span className="data-label">{historyResult?.data.length ?? 0} PEOPLE</span>
          </div>
          <ul className="audience-history__list">
            {historyResult?.data.map(({ member, interactions, sources, openQuestionCount }) => (
              <li className="audience-history__item" key={member.id}>
                <div className="audience-history__identity">
                  <span className="section-label">{member.display_name}</span>
                  <span className="data-label">{platformLabel(member.platform)}</span>
                </div>
                <div className="audience-history__facts">
                  <span>{interactions.length} conversation{interactions.length === 1 ? "" : "s"}</span>
                  <span>{openQuestionCount} open question{openQuestionCount === 1 ? "" : "s"}</span>
                  <span>Last seen {shortDate(member.last_seen_at)}</span>
                </div>
                <details className="audience-history__timeline">
                  <summary>View factual timeline</summary>
                  <ol>
                    {interactions.map((interaction) => {
                      const source = sources[interaction.source_id];
                      return (
                        <li key={interaction.id}>
                          <span className="data-label">
                             {shortDate(interaction.published_at)} / {isOnboardingInteraction(interaction.raw_metadata) ? "onboarding" : interaction.interaction_type} / {interaction.platform}
                          </span>
                          <p>{interaction.text}</p>
                          {source ? (
                            <span className="audience-history__source">
                              {source.title}
                              {source.url ? (
                                <a href={source.url} target="_blank" rel="noreferrer">
                                  View source ↗
                                </a>
                              ) : null}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppScreen>
  );
}
