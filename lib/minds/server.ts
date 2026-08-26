import "server-only";

export { getMindsConfigStatus } from "@/lib/minds/config";
export {
  createMindsSpikeFailure,
  runMemoraContinuitySpike,
} from "@/lib/minds/memora-mind";
export type {
  ContinuityProof,
  EventProof,
  HistoryProof,
  MindsConfigStatus,
  MindsErrorInfo,
  MindsSpikeResult,
} from "@/lib/minds/types";
