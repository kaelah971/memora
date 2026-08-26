import assert from "node:assert/strict";
import test from "node:test";

import {
  getDiscordConfigStatus,
  readDiscordConfig,
} from "../../lib/discord/config";
import {
  createDiscordApiClient,
  type DiscordChannel,
} from "../../lib/discord/client";
import type { DiscordConfig } from "../../lib/discord/config";
import {
  discordAudienceMemberId,
  discordCreatorEventId,
  discordInteractionId,
  discordSourceId,
  isAnnouncementChannel,
} from "../../lib/discord/ids";

const config: DiscordConfig = {
  botToken: "discord-secret",
  guildId: "1541889129237848164",
  monitoredChannelIds: ["1541890626864554110", "1541890494035136522"],
};

test("Discord config validates IDs and never exposes the bot token", () => {
  const status = getDiscordConfigStatus({
    DISCORD_BOT_TOKEN: config.botToken,
    DISCORD_GUILD_ID: config.guildId,
    DISCORD_MONITORED_CHANNEL_IDS: `${config.monitoredChannelIds[0]}, ${config.monitoredChannelIds[1]}, ${config.monitoredChannelIds[0]}`,
  });

  assert.equal(status.ready, true);
  assert.deepEqual(status.monitoredChannelIds, config.monitoredChannelIds);
  assert.equal(JSON.stringify(status).includes(config.botToken), false);
  assert.throws(() => readDiscordConfig({}), /DISCORD_BOT_TOKEN/);
});

test("Discord API client only requests configured channels and bounds message limits", async () => {
  const requests: string[] = [];
  const client = createDiscordApiClient(config, async (input) => {
    requests.push(String(input));
    const path = String(input);
    if (path.endsWith(`/guilds/${config.guildId}`)) {
      return new Response(JSON.stringify({ id: config.guildId, name: "Memora" }), { status: 200 });
    }
    return new Response(JSON.stringify([]), { status: 200 });
  });

  await client.getGuild();
  await client.getMessages(config.monitoredChannelIds[0], 500);
  await assert.rejects(
    client.getMessages("1541890000000000000", 10),
    /not configured for import/,
  );

  assert.equal(requests[1].endsWith(`/channels/${config.monitoredChannelIds[0]}/messages?limit=50`), true);
});

test("Discord send helper only sends bounded server-selected onboarding messages", async () => {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const client = createDiscordApiClient(config, async (input, init) => {
    requests.push({ url: String(input), init: init ?? {} });
    return new Response(JSON.stringify({ id: "sent-message", channel_id: config.monitoredChannelIds[0], content: "Welcome" }), { status: 200 });
  });

  const sent = await client.sendMessage(config.monitoredChannelIds[0], "Welcome");
  assert.equal(sent.id, "sent-message");
  assert.equal(requests[0].url.endsWith(`/channels/${config.monitoredChannelIds[0]}/messages`), true);
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[0].init.body)), { content: "Welcome", allowed_mentions: { parse: [] } });
  await assert.rejects(client.sendMessage("1541890000000000000", "No"), /not configured for onboarding/);
  await assert.rejects(client.sendMessage(config.monitoredChannelIds[0], " "), /empty or too long/);
});

test("Discord source and message identities are deterministic and announcements are classified by channel", () => {
  assert.equal(discordSourceId("creator-1", config.guildId, config.monitoredChannelIds[0]), discordSourceId("creator-1", config.guildId, config.monitoredChannelIds[0]));
  assert.equal(discordAudienceMemberId("creator-1", "member-1"), discordAudienceMemberId("creator-1", "member-1"));
  assert.equal(discordInteractionId("creator-1", "message-1"), discordInteractionId("creator-1", "message-1"));
  assert.equal(discordCreatorEventId("creator-1", "message-1"), discordCreatorEventId("creator-1", "message-1"));
  assert.notEqual(discordInteractionId("creator-1", "message-1"), discordCreatorEventId("creator-1", "message-1"));

  const announcements: DiscordChannel = {
    id: config.monitoredChannelIds[1],
    name: "announcements",
    type: 0,
  };
  assert.equal(isAnnouncementChannel(announcements), true);
  assert.equal(isAnnouncementChannel({ id: config.monitoredChannelIds[0], name: "creator-questions", type: 0 }), false);
});
