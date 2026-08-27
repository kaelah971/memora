import { DEMO_WORKSPACE_ACCESS_ENV } from "@/lib/supabase/config";
import type { DataAccessStatus } from "@/lib/data/types";

type Environment = Record<string, string | undefined>;

export function getProductionWorkspaceAccessBlock(
  environment: Environment = process.env,
): DataAccessStatus | null {
  if (environment.NODE_ENV !== "production" || environment[DEMO_WORKSPACE_ACCESS_ENV] === "enabled") return null;

  return {
    available: false,
    mode: "unavailable",
    reason: "Production workspace access is disabled. Set MEMORA_DEMO_WORKSPACE_ACCESS=enabled on the server for the hackathon demo workspace.",
  };
}
