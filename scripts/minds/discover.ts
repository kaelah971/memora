import "../load-env";

import { createDiscoveryMindsClient } from "../../lib/minds/client";
import { readDiscoveryConfig } from "../../lib/minds/config";
import { toMindsErrorInfo } from "../../lib/minds/errors";

async function main(): Promise<void> {
  try {
    const { builderApiKey } = readDiscoveryConfig();
    const client = createDiscoveryMindsClient(builderApiKey);
    const minds = await client.listMinds();

    console.log(`Minds discovered: ${minds.length}`);

    for (const mind of minds) {
      const details = await client.getMind(mind.mindId);
      console.log(
        JSON.stringify(
          {
            mindId: details.mindId,
            name: details.name ?? null,
            model: details.model ?? null,
            species: details.species ?? null,
            isEnabled: details.isEnabled ?? null,
          },
          null,
          2,
        ),
      );
    }
  } catch (error) {
    const diagnostic = toMindsErrorInfo(error);
    console.error(
      `Minds discovery failed [${diagnostic.code}]${diagnostic.status ? ` HTTP ${diagnostic.status}` : ""}: ${diagnostic.message}`,
    );
    if (diagnostic.requestId) console.error(`requestId: ${diagnostic.requestId}`);
    process.exitCode = 1;
  }
}

void main();
