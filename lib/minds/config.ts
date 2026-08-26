import {
  BUILDER_API_KEY_ENV,
} from "@animocabrands/minds-client-lib";

import {
  MEMORA_MIND_ALIAS_DEFAULT,
  type MindsConfig,
  type MindsConfigStatus,
} from "@/lib/minds/types";

const MIND_ID_ENV = "MEMORA_MIND_ID";
const MIND_ALIAS_ENV = "MEMORA_MIND_ALIAS";
type Environment = Record<string, string | undefined>;

export class MindsConfigError extends Error {
  readonly missing: string[];

  constructor(message: string, missing: string[] = []) {
    super(message);
    this.name = "MindsConfigError";
    this.missing = missing;
  }
}

function readValue(environment: Environment, key: string): string | undefined {
  const value = environment[key]?.trim();
  return value || undefined;
}

export function getMindsConfigStatus(
  environment: Environment = process.env,
): MindsConfigStatus {
  const apiKey = readValue(environment, BUILDER_API_KEY_ENV);
  const mindId = readValue(environment, MIND_ID_ENV);
  const alias = readValue(environment, MIND_ALIAS_ENV) ?? MEMORA_MIND_ALIAS_DEFAULT;
  const missing = [
    !apiKey ? BUILDER_API_KEY_ENV : null,
    !mindId ? MIND_ID_ENV : null,
  ].filter((key): key is string => Boolean(key));

  return {
    apiKeyConfigured: Boolean(apiKey),
    mindIdConfigured: Boolean(mindId),
    configuredMindId: mindId ?? null,
    alias,
    missing,
    ready: missing.length === 0,
  };
}

export function readMindsConfig(
  environment: Environment = process.env,
  options: { requireMindId?: boolean } = {},
): MindsConfig {
  const apiKey = readValue(environment, BUILDER_API_KEY_ENV);
  const mindId = readValue(environment, MIND_ID_ENV);
  const alias = readValue(environment, MIND_ALIAS_ENV) ?? MEMORA_MIND_ALIAS_DEFAULT;
  const requireMindId = options.requireMindId ?? true;
  const missing = [
    !apiKey ? BUILDER_API_KEY_ENV : null,
    requireMindId && !mindId ? MIND_ID_ENV : null,
  ].filter((key): key is string => Boolean(key));

  if (missing.length > 0) {
    throw new MindsConfigError(
      `Minds configuration is incomplete. Missing: ${missing.join(", ")}.`,
      missing,
    );
  }

  return {
    builderApiKey: apiKey as string,
    mindId: mindId as string,
    alias,
  };
}

export function readDiscoveryConfig(environment: Environment = process.env): {
  builderApiKey: string;
} {
  const apiKey = readValue(environment, BUILDER_API_KEY_ENV);

  if (!apiKey) {
    throw new MindsConfigError(`Minds configuration is incomplete. Missing: ${BUILDER_API_KEY_ENV}.`, [
      BUILDER_API_KEY_ENV,
    ]);
  }

  return { builderApiKey: apiKey };
}

export { BUILDER_API_KEY_ENV, MIND_ALIAS_ENV, MIND_ID_ENV };
