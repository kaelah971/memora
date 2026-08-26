import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { getCreatorWorkspaceSummary } from "@/lib/data/creators";

export const dynamic = "force-dynamic";

function CountBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="workspace-count">
      <strong>{value}</strong>
      <span className="data-label">{label}</span>
    </div>
  );
}

export default async function AppHomePage() {
  const result = await getCreatorWorkspaceSummary();

  return (
    <AppScreen
      eyebrow="MEMORA / HOME"
      title="Your memory desk is ready."
      description="P1 now reads deterministic creator context when the local Supabase access path is configured."
      status="DATABASE STATE / P1"
    >
      {!result.access.available ? (
        <DataSetupState reason={result.error ?? "Supabase data access is not configured."} />
      ) : result.data ? (
        <section className="workspace-state" aria-labelledby="workspace-state-title">
          <div className="workspace-state__heading">
            <div>
              <span className="section-label">{result.data.creator.display_name}</span>
              <h2 id="workspace-state-title">Facts before reasoning.</h2>
              <p>These counts come from persisted sources and creator records. No semantic conclusions are included.</p>
            </div>
            <span className="state-sticker state-sticker--remembered">DATABASE CONNECTED</span>
          </div>
          <div className="workspace-counts">
            <CountBlock label="INTERACTIONS" value={result.data.counts.interactions} />
            <CountBlock label="OPEN QUESTIONS" value={result.data.counts.openQuestions} />
            <CountBlock label="AUDIENCE MEMBERS" value={result.data.counts.audienceMembers} />
            <CountBlock label="CREATOR EVENTS" value={result.data.counts.creatorEvents} />
          </div>
        </section>
      ) : (
        <ProductEmptyState
          eyebrow="NO DEMO CREATOR"
          title="Your database is reachable, but no demo workspace exists yet."
          description="Run the idempotent database seed command to create the factual Alex, Maya and Jordan dataset."
          href="/app/settings"
          actionLabel="Open creator control"
        />
      )}
    </AppScreen>
  );
}
