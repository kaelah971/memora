import { AppScreen } from "@/components/memora/app-screen";
import { ProductEmptyState } from "@/components/memora/product-empty-state";

export default function QueuePage() {
  return (
    <AppScreen
      eyebrow="MEMORA / QUEUE"
      title="Reply queue"
      description="A clear reason should come before a suggested action. This shell is waiting for real source context."
      status="BOUNDARY STATE / P1"
    >
      <ProductEmptyState
        eyebrow="NOTHING TO REVIEW"
        title="Nothing needs your attention yet."
        description="Memora will surface source-backed opportunities here after a creator imports a conversation."
      />
    </AppScreen>
  );
}
