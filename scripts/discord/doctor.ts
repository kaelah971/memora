import "../load-env";

import { createDiscordApiClient } from "../../lib/discord/client";
import { getDiscordConfigStatus, readDiscordConfig } from "../../lib/discord/config";
import { toDiscordIntegrationError } from "../../lib/discord/errors";

async function main(): Promise<void> {
  const status = getDiscordConfigStatus();
  console.log("Memora Discord doctor");
  console.log(`config: ${status.ready ? "configured" : "missing"}`);
  console.log(`guild ID: ${status.configuredGuildId ?? "[none]"}`);
  console.log(`monitored channels: ${status.monitoredChannelIds.length}`);
  if (!status.ready) {
    console.error(`Missing: ${status.missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  try {
    const config = readDiscordConfig();
    const client = createDiscordApiClient(config);
    const guild = await client.getGuild();
    console.log(`bot access: ok`);
    console.log(`guild: ${guild.name} (${guild.id})`);
    for (const channelId of config.monitoredChannelIds) {
      const channel = await client.getChannel(channelId);
      const messages = await client.getMessages(channelId, 1);
      console.log(`channel #${channel.name ?? channelId}: ok / recent messages=${messages.length} / content readable`);
    }
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    console.error(`Discord doctor failed [${safeError.code}]: ${safeError.message}`);
    process.exitCode = 1;
  }
}

void main();
