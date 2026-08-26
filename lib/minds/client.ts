import {
  createMindsClient,
  type MindsClient,
} from "@animocabrands/minds-client-lib";

import type { MindsConfig } from "@/lib/minds/types";

export function createAuthenticatedMindsClient(config: MindsConfig): MindsClient {
  return createMindsClient({ builderApiKey: config.builderApiKey });
}

export function createDiscoveryMindsClient(builderApiKey: string): MindsClient {
  return createMindsClient({ builderApiKey });
}
