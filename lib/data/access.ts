import "server-only";

import { createServiceRoleSupabaseClient } from "@/lib/supabase/admin";
import { getProductionWorkspaceAccessBlock } from "@/lib/data/access-policy";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { DataAccessStatus, DataClient } from "@/lib/data/types";

export interface DevelopmentDataAccess {
  client: DataClient | null;
  status: DataAccessStatus;
  workspaceId: string | null;
  creatorId: string | null;
}

type Environment = Record<string, string | undefined>;

export function getDevelopmentDataAccess(environment: Environment = process.env): DevelopmentDataAccess {
  const config = getSupabaseConfigStatus(environment);
  const productionAccessBlock = getProductionWorkspaceAccessBlock(environment);

  if (productionAccessBlock) {
    return {
      client: null,
      status: productionAccessBlock,
      workspaceId: null,
      creatorId: null,
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
      workspaceId: null,
      creatorId: null,
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
      workspaceId: null,
      creatorId: null,
    };
  }

  try {
    return {
      client: createServiceRoleSupabaseClient(environment),
      status: { available: true, mode: "service_role", reason: null },
      workspaceId: null,
      creatorId: null,
    };
  } catch (error) {
    return {
      client: null,
      status: {
        available: false,
        mode: "unavailable",
        reason: error instanceof Error ? error.message : "Supabase configuration could not be loaded.",
      },
      workspaceId: null,
      creatorId: null,
    };
  }
}

export async function getCurrentDataAccess(mode?: "mine" | "demo"): Promise<DevelopmentDataAccess> {
  const { getCurrentWorkspaceContext } = await import("@/lib/workspaces/access");
  const context = await getCurrentWorkspaceContext(mode);
  return {
    client: context.data?.client ?? null,
    status: context.access,
    workspaceId: context.data?.workspace.id ?? null,
    creatorId: context.data?.creator.id ?? null,
  };
}

export function isCurrentCreatorAccess(access: DevelopmentDataAccess, creatorId: string): boolean {
  return Boolean(access.client && access.workspaceId && access.creatorId === creatorId);
}
