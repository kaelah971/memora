import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

const SUPABASE_URL_ENV = "NEXT_PUBLIC_SUPABASE_URL";
const SUPABASE_ANON_KEY_ENV = "NEXT_PUBLIC_SUPABASE_ANON_KEY";
const SUPABASE_SERVICE_ROLE_KEY_ENV = "SUPABASE_SERVICE_ROLE_KEY";
const DEV_ACCESS_ENV = "MEMORA_DEV_DB_ACCESS";
const DEMO_WORKSPACE_ACCESS_ENV = "MEMORA_DEMO_WORKSPACE_ACCESS";

type Environment = Record<string, string | undefined>;

export interface SupabaseConfigStatus {
  urlConfigured: boolean;
  anonKeyConfigured: boolean;
  serviceRoleConfigured: boolean;
  developmentAccessEnabled: boolean;
  demoWorkspaceAccessEnabled: boolean;
  missingPublic: string[];
}

export interface SupabasePublicConfig {
  url: string;
  anonKey: string;
}

export interface SupabaseServiceRoleConfig extends SupabasePublicConfig {
  serviceRoleKey: string;
}

export class SupabaseConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "SupabaseConfigError";
    this.missing = missing;
  }
}

function readValue(environment: Environment, key: string): string | undefined {
  const value = environment[key]?.trim();
  return value || undefined;
}

function readPublicValues(environment: Environment): SupabasePublicConfig {
  const url = readValue(environment, SUPABASE_URL_ENV);
  const anonKey = readValue(environment, SUPABASE_ANON_KEY_ENV);
  const missing = [
    !url ? SUPABASE_URL_ENV : null,
    !anonKey ? SUPABASE_ANON_KEY_ENV : null,
  ].filter((key): key is string => Boolean(key));

  if (missing.length > 0) {
    throw new SupabaseConfigError(
      `Supabase public configuration is incomplete. Missing: ${missing.join(", ")}.`,
      missing,
    );
  }

  try {
    new URL(url as string);
  } catch {
    throw new SupabaseConfigError(`${SUPABASE_URL_ENV} must be a valid URL.`, [SUPABASE_URL_ENV]);
  }

  return { url: url as string, anonKey: anonKey as string };
}

export function getSupabaseConfigStatus(
  environment: Environment = process.env,
): SupabaseConfigStatus {
  const urlConfigured = Boolean(readValue(environment, SUPABASE_URL_ENV));
  const anonKeyConfigured = Boolean(readValue(environment, SUPABASE_ANON_KEY_ENV));
  const serviceRoleConfigured = Boolean(readValue(environment, SUPABASE_SERVICE_ROLE_KEY_ENV));
  const missingPublic = [
    !urlConfigured ? SUPABASE_URL_ENV : null,
    !anonKeyConfigured ? SUPABASE_ANON_KEY_ENV : null,
  ].filter((key): key is string => Boolean(key));

  return {
    urlConfigured,
    anonKeyConfigured,
    serviceRoleConfigured,
    developmentAccessEnabled: environment[DEV_ACCESS_ENV] === "service_role",
    demoWorkspaceAccessEnabled: environment[DEMO_WORKSPACE_ACCESS_ENV] === "enabled",
    missingPublic,
  };
}

export function assertDevelopmentServiceRoleAccess(environment: Environment = process.env): void {
  if (environment[DEV_ACCESS_ENV] !== "service_role") {
    throw new SupabaseConfigError(
      `Set ${DEV_ACCESS_ENV}=service_role to enable trusted local database operations.`,
    );
  }
}

export function assertDemoWorkspaceAccess(environment: Environment = process.env): void {
  if (environment[DEMO_WORKSPACE_ACCESS_ENV] !== "enabled") {
    throw new SupabaseConfigError(
      `Set ${DEMO_WORKSPACE_ACCESS_ENV}=enabled to enable the production hackathon demo workspace.`,
    );
  }
}

export function readSupabasePublicConfig(
  environment: Environment = process.env,
): SupabasePublicConfig {
  return readPublicValues(environment);
}

export function readSupabaseServiceRoleConfig(
  environment: Environment = process.env,
): SupabaseServiceRoleConfig {
  const publicConfig = readPublicValues(environment);
  const serviceRoleKey = readValue(environment, SUPABASE_SERVICE_ROLE_KEY_ENV);

  if (!serviceRoleKey) {
    throw new SupabaseConfigError(
      `Supabase service-role configuration is incomplete. Missing: ${SUPABASE_SERVICE_ROLE_KEY_ENV}.`,
      [SUPABASE_SERVICE_ROLE_KEY_ENV],
    );
  }

  return { ...publicConfig, serviceRoleKey };
}

export function createServiceRoleSupabaseClient(
  environment: Environment = process.env,
) {
  const config = readSupabaseServiceRoleConfig(environment);

  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export {
  DEV_ACCESS_ENV,
  SUPABASE_ANON_KEY_ENV,
  SUPABASE_SERVICE_ROLE_KEY_ENV,
  SUPABASE_URL_ENV,
  DEMO_WORKSPACE_ACCESS_ENV,
};
