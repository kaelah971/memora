"use server";

import {
  createMindsSpikeFailure,
  runMemoraContinuitySpike,
} from "@/lib/minds/server";
import type { MindsSpikeResult } from "@/lib/minds/types";

export async function runMindsSpikeAction(
  _previousState: MindsSpikeResult | null,
  _formData: FormData,
): Promise<MindsSpikeResult> {
  void _previousState;
  void _formData;

  if (process.env.NODE_ENV !== "development") {
    return createMindsSpikeFailure({
      code: "DEBUG_ROUTE_DISABLED",
      message: "The Minds spike route is development-only. Run the CLI locally for a live proof.",
    });
  }

  return runMemoraContinuitySpike();
}
