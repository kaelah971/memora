import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { FollowUpQueue } from "@/components/memora/follow-up-queue";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { getCreatorWorkspace } from "@/lib/data/creators";
import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";
import { getYouTubeConnection } from "@/lib/youtube/storage";
import { getCurrentWorkspaceSelection } from "@/lib/workspaces/access";
import { workspaceBasePath } from "@/lib/workspaces/entry";

export const dynamic = "force-dynamic";

export default async function FollowUpPage() {
  const selection = await getCurrentWorkspaceSelection();
  const basePath = workspaceBasePath(selection.mode);
  const creatorResult = await getCreatorWorkspace();
  const queueResult = creatorResult.data
    ? await listFollowUpOpportunities(creatorResult.data.id)
    : null;
  const postingEnabled = creatorResult.data
    ? Boolean(await getYouTubeConnection(creatorResult.data.id).catch(() => null))
    : false;

  return (
    <AppScreen
      eyebrow="MEMORA / FOLLOW UP"
      title="Follow-up review"
      description="Inspect the source-backed memory thread, ask Memora Mind for advisory reasoning, then decide what to do."
      status="P5 / LIVE MIND"
    >
      {!creatorResult.access.available ? (
        <DataSetupState reason={creatorResult.error ?? "Supabase data access is not configured."} />
      ) : !creatorResult.data ? (
        <ProductEmptyState
          eyebrow="NO CREATOR WORKSPACE"
          title="The opportunity queue has no workspace yet."
          description="Connect the deterministic workspace, then import source-backed audience moments to find follow-up opportunities."
          href={`${basePath}/import`}
          actionLabel="Open import"
        />
      ) : queueResult && !queueResult.access.available ? (
        <DataSetupState reason={queueResult.error ?? "Follow-up opportunities could not be loaded."} />
      ) : queueResult?.error ? (
        <DataSetupState reason={queueResult.error} />
      ) : queueResult ? (
        <section className="follow-up-queue" aria-labelledby="follow-up-queue-title">
          <div className="follow-up-queue__intro">
            <div>
              <span className="section-label">THE MEMORY THREAD</span>
              <h2 id="follow-up-queue-title">The next useful conversation is visible.</h2>
              <p>
                Memora connects an audience question to creator content that gives you a real reason to reconnect. Ask Memora Mind for advisory reasoning, then keep every reply behind creator approval and final confirmation.
              </p>
            </div>
            <div className="follow-up-queue__proof-note">
              <span className="state-sticker state-sticker--complete">MEMORA MIND AVAILABLE</span>
              <p>The queue remains built from Supabase facts. Memora Mind explains the thread and never posts its own generated text.</p>
            </div>
          </div>

          <div className="follow-up-queue__summary" aria-label="Opportunity queue summary">
            <div>
              <span className="data-label">VISIBLE OPPORTUNITIES</span>
              <strong>{queueResult.data.opportunities.length}</strong>
            </div>
            <div>
              <span className="data-label">DATA PATH</span>
                <strong>{queueResult.data.dataOrigin === "real-youtube" ? "REAL YOUTUBE IMPORT" : queueResult.data.dataOrigin === "real-discord" ? "REAL DISCORD IMPORT" : queueResult.data.dataOrigin === "real-multi-source" ? "REAL MULTI-SOURCE IMPORT" : queueResult.data.dataOrigin === "demo-seed-fallback" ? "DEMO FALLBACK" : "WAITING FOR SOURCE DATA"}</strong>
            </div>
            <div>
              <span className="data-label">REVIEW STATE</span>
              <strong>CREATOR DECIDES</strong>
            </div>
          </div>

          {queueResult.data.opportunities.length > 0 ? (
             <FollowUpQueue opportunities={queueResult.data.opportunities} postingEnabled={postingEnabled} />
          ) : (
            <ProductEmptyState
              eyebrow={queueResult.data.dataOrigin === "none" ? "NO OPPORTUNITIES YET" : "NO CLEAR MATCHES"}
              title={queueResult.data.dataOrigin === "none" ? "No opportunities yet." : "No transparent follow-up match yet."}
              description={queueResult.data.dataOrigin === "none" ? "Import source-backed moments from YouTube or Discord. Memora will only create a card when a question and later creator event share a clear source or topic connection." : "The queue found source records but no question and later creator event connected by the current transparent heuristics. Nothing has been invented."}
               href={`${basePath}/import`}
              actionLabel="Open import"
            />
          )}
        </section>
      ) : null}
    </AppScreen>
  );
}
