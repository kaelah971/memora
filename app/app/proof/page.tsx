import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { JudgeProof } from "@/components/memora/judge-proof";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { loadJudgeProof } from "@/lib/data/judge-proof";

export const dynamic = "force-dynamic";

export default async function ProofPage() {
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
          href="/app/import"
          actionLabel="Open import"
        />
      ) : (
        <JudgeProof proof={proofResult.data} />
      )}
    </AppScreen>
  );
}
