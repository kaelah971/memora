import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { WorkspaceEntryChoice } from "@/components/memora/workspace-entry-choice";
import { getCreatorWorkspaceSummary } from "@/lib/data/creators";
import { getCurrentWorkspaceSelection, requiresWorkspaceChoice } from "@/lib/workspaces/access";
import { redirect } from "next/navigation";

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
  const selection = await getCurrentWorkspaceSelection();

  if (selection.route === "entry" && selection.user) redirect("/app/my");
  if (selection.route === "mine" && !selection.user) redirect("/login?next=%2Fapp%2Fmy");

  if (requiresWorkspaceChoice(selection)) {
    return (
      <AppScreen
        eyebrow="MEMORA / ENTRY"
        title="Choose your workspace."
        description="Start with the public demo, or sign in to keep your own audience memory separate."
        status="WORKSPACE / CHOOSE"
      >
        <WorkspaceEntryChoice demoAvailable={selection.demoAvailable} />
      </AppScreen>
    );
  }

  const result = await getCreatorWorkspaceSummary();

  return (
    <AppScreen
      eyebrow="MEMORA / HOME"
      title={result.data?.creator.display_name ? `${result.data.creator.display_name}'s memory desk.` : "Your memory desk is ready."}
      description="Your workspace keeps source evidence, audience memory and follow-up decisions in one place."
      status={result.data?.creator.display_name ? "WORKSPACE / CONNECTED" : "DATABASE STATE / P1"}
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
