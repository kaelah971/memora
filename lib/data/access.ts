import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getProductionWorkspaceAccessBlock } from "@/lib/data/access-policy";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { DataAccessStatus, DataClient } from "@/lib/data/types";

export interface DevelopmentDataAccess {
  client: DataClient | null;
  status: DataAccessStatus;
}

type Environment = Record<string, string | undefined>;

export function getDevelopmentDataAccess(environment: Environment = process.env): DevelopmentDataAccess {
  const config = getSupabaseConfigStatus(environment);
  const productionAccessBlock = getProductionWorkspaceAccessBlock(environment);

  if (productionAccessBlock) {
    return {
      client: null,
      status: productionAccessBlock,
    };
  }

  if (config.missingPublic.length > 0 || !config.serviceRoleConfigured) {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: "Configure Supabase public variables and SUPABASE_SERVICE_ROLE_KEY for server-side data access.",
      },
    };
  }

  if (environment.NODE_ENV !== "production" && !config.developmentAccessEnabled) {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: "Set MEMORA_DEV_DB_ACCESS=service_role to explicitly enable local database reads.",
      },
    };
  }

  try {
    return {
      client: createServiceRoleSupabaseClient(environment),
      status: { available: true, mode: "service_role", reason: null },
    };
  } catch (error) {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: error instanceof Error ? error.message : "Supabase configuration could not be loaded.",
      },
    };
  }
}
