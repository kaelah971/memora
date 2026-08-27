import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { QueueOpportunityList } from "@/components/memora/queue-opportunity-list";
import { getCreatorWorkspace } from "@/lib/data/creators";
import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";
import { getCurrentWorkspaceSelection } from "@/lib/workspaces/access";
import { workspaceBasePath } from "@/lib/workspaces/entry";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const selection = await getCurrentWorkspaceSelection();
  const basePath = workspaceBasePath(selection.mode);
  const creatorResult = await getCreatorWorkspace();
  const queueResult = creatorResult.data
    ? await listFollowUpOpportunities(creatorResult.data.id)
    : null;

  return (
    <AppScreen
      eyebrow="MEMORA / QUEUE"
      title="Available follow-ups"
      description="A short list of source-backed opportunities. Open one to inspect the full memory thread and decide what happens next."
      status="SOURCE-BACKED / P5"
    >
      {!creatorResult.access.available ? (
        <DataSetupState reason={creatorResult.error ?? "Supabase data access is not configured."} />
      ) : !creatorResult.data ? (
        <ProductEmptyState
          eyebrow="NO CREATOR WORKSPACE"
          title="The queue has no workspace yet."
          description="Connect your workspace, then import source-backed audience moments to find follow-up opportunities."
          href={`${basePath}/import`}
          actionLabel="Open import"
        />
      ) : queueResult && !queueResult.access.available ? (
        <DataSetupState reason={queueResult.error ?? "Follow-up opportunities could not be loaded."} />
      ) : queueResult?.error ? (
        <DataSetupState reason={queueResult.error} />
      ) : queueResult && queueResult.data.opportunities.length > 0 ? (
        <section className="queue-overview" aria-labelledby="queue-overview-title">
          <header className="queue-overview__header">
            <div>
              <span className="section-label">THE MEMORY THREAD / AVAILABLE NOW</span>
              <h2 id="queue-overview-title">These conversations have somewhere useful to go.</h2>
              <p>Queue is the list. Follow Up is the detailed review, with source evidence, Mind advisory reasoning and creator-controlled actions.</p>
            </div>
            <div className="queue-overview__summary">
              <strong>{queueResult.data.opportunities.length}</strong>
              <span className="data-label">OPPORTUNITIES</span>
            </div>
          </header>
          <QueueOpportunityList opportunities={queueResult.data.opportunities} basePath={basePath} />
        </section>
      ) : (
        <ProductEmptyState
          eyebrow="NOTHING TO REVIEW"
          title="Nothing needs your attention yet."
          description="Memora will show source-backed follow-up opportunities here after a question and a later creator event form a clear connection."
          href={`${basePath}/import`}
          actionLabel="Open import"
        />
      )}
    </AppScreen>
  );
}
