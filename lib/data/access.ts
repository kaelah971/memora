import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { DataAccessStatus, DataClient } from "@/lib/data/types";

export interface DevelopmentDataAccess {
  client: DataClient | null;
  status: DataAccessStatus;
}

export function getDevelopmentDataAccess(): DevelopmentDataAccess {
  const config = getSupabaseConfigStatus();

  if (process.env.NODE_ENV === "production") {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: "Authentication is required before database workspace access is enabled in production.",
      },
    };
  }

  if (config.missingPublic.length > 0 || !config.serviceRoleConfigured) {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: "Configure Supabase public variables and SUPABASE_SERVICE_ROLE_KEY for local data access.",
      },
    };
  }

  if (!config.developmentAccessEnabled) {
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
      client: createServiceRoleSupabaseClient(),
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
