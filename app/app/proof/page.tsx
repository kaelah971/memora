import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { JudgeProof } from "@/components/memora/judge-proof";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { WorkspaceSetupChecklist } from "@/components/memora/workspace-setup-checklist";
import { loadJudgeProof } from "@/lib/data/judge-proof";
import { getCurrentWorkspaceSelection } from "@/lib/workspaces/access";
import { workspaceBasePath } from "@/lib/workspaces/entry";

export const dynamic = "force-dynamic";

export default async function ProofPage() {
  const selection = await getCurrentWorkspaceSelection();
  const basePath = workspaceBasePath(selection.mode);
  const proofResult = await loadJudgeProof();

  return (
    <AppScreen
      eyebrow="MEMORA / PROOF"
      title="Judge Proof"
      description="The complete evidence path from a real audience moment to a creator-approved follow-up draft."
       status="P8 / VERIFIED LOOP"
    >
      {!proofResult.access.available ? (
        <DataSetupState reason={proofResult.error ?? "Supabase data access is not configured."} />
      ) : proofResult.error ? (
        <DataSetupState reason={proofResult.error} />
      ) : !proofResult.data.systemStatus.supabasePersistenceVerified ? (
        <ProductEmptyState
          eyebrow="NO CREATOR WORKSPACE"
          title="The proof thread needs a workspace first."
          description="Connect the deterministic workspace, then import a source-backed audience moment to make the loop visible."
           href={`${basePath}/import`}
          actionLabel="Open import"
        />
      ) : proofResult.data.ingestion.dataOrigin === "none" && proofResult.data.audience.length === 0 && proofResult.data.queue.total === 0 ? (
        <WorkspaceSetupChecklist basePath={basePath} />
      ) : (
        <JudgeProof proof={proofResult.data} basePath={basePath} />
      )}
    </AppScreen>
  );
}
