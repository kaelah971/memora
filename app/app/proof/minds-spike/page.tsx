import { AppScreen } from "@/components/memora/app-screen";
import { MindsSpikeProof } from "@/app/app/proof/minds-spike/minds-spike-proof";
import { getMindsConfigStatus } from "@/lib/minds/server";

export default function MindsSpikePage() {
  return (
    <AppScreen
      eyebrow="MEMORA / MINDS SPIKE"
      title="Minds continuity proof"
      description="A development-only proof surface for the real Builder API conversation used by Memora."
    >
      <MindsSpikeProof configStatus={getMindsConfigStatus()} />
    </AppScreen>
  );
}
