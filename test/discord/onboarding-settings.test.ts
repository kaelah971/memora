import assert from "node:assert/strict";
import test from "node:test";

import type { DataClient } from "../../lib/data/types";
import {
  defaultDiscordOnboardingSettings,
  discordOnboardingSettingsView,
  discordOnboardingSettingsRow,
  onboardingSettingsInput,
  parseDiscordOnboardingSettingsInput,
  validateDiscordOnboardingSettings,
} from "../../lib/discord/onboarding-settings";
import { readDiscordOnboardingSettings, writeDiscordOnboardingSettings } from "../../lib/discord/onboarding-settings-storage";
import {
  getDiscordOnboardingSettings as getListenerOnboardingSettings,
  onboardingSettingsInput as listenerOnboardingSettingsInput,
  type DiscordListenerStorage,
} from "../../lib/discord/listener-storage";
import type { DiscordOnboardingSettings } from "../../lib/discord/onboarding-settings";

const creatorId = "creator-1";
const connectionId = "connection-1";
const selectedChannelIds = ["channel-announcements", "channel-questions", "channel-support", "channel-builders"];

const emptySettingsRow: DiscordOnboardingSettings = {
  id: "settings-1",
  creator_id: creatorId,
  discord_connection_id: connectionId,
  enabled: false,
  send_mode: "draft_only",
  welcome_channel_id: null,
  resource_channel_id: null,
  question_channel_id: null,
  support_channel_id: null,
  builder_channel_id: null,
  beginner_guide_text: "Default guide",
  created_at: "2026-08-26T12:00:00.000Z",
  updated_at: "2026-08-26T12:00:00.000Z",
};

function settingsClient(initial: DiscordOnboardingSettings | null = null): { client: DataClient; read: () => DiscordOnboardingSettings | null } {
  let stored = initial;
  const client = {
    from: () => {
      const filters = new Map<string, string>();
      const query = {
        select: () => query,
        eq: (column: string, value: string) => {
          filters.set(column, value);
          return query;
        },
        upsert: (row: Partial<DiscordOnboardingSettings>) => {
          stored = {
            ...emptySettingsRow,
            ...stored,
            ...row,
            id: stored?.id ?? emptySettingsRow.id,
            created_at: stored?.created_at ?? emptySettingsRow.created_at,
            updated_at: "2026-08-26T12:01:00.000Z",
          };
          return query;
        },
        maybeSingle: async () => ({
          data: stored && filters.get("creator_id") === stored.creator_id && filters.get("discord_connection_id") === stored.discord_connection_id ? stored : null,
          error: null,
        }),
        single: async () => ({ data: stored, error: null }),
      };
      return query;
    },
  } as unknown as DataClient;
  return { client, read: () => stored };
}

function listenerStorage(client: DataClient): DiscordListenerStorage {
  return { client, status: { available: true, mode: "service_role", reason: null } };
}

test("saving onboarding settings persists send mode and channel IDs for reload and listener reads", async () => {
  const input = {
    enabled: true,
    sendMode: "auto_send_clear_guide_requests" as const,
    welcomeChannelId: "channel-announcements",
    resourceChannelId: "channel-announcements",
    questionChannelId: "channel-questions",
    supportChannelId: "channel-support",
    builderChannelId: "channel-builders",
    beginnerGuideText: "Start in #announcements, then ask in #creator-questions.",
  };
  const validation = validateDiscordOnboardingSettings(input, selectedChannelIds);
  assert.equal(validation.error, null);
  assert.ok(validation.data);

  const fake = settingsClient();
  const saved = await writeDiscordOnboardingSettings(fake.client, discordOnboardingSettingsRow(creatorId, connectionId, validation.data));
  assert.equal(saved.error, null);
  assert.deepEqual(onboardingSettingsInput(saved.data, selectedChannelIds), input);

  const reloaded = await readDiscordOnboardingSettings(fake.client, creatorId, connectionId);
  assert.equal(reloaded.error, null);
  assert.deepEqual(onboardingSettingsInput(reloaded.data, selectedChannelIds), input);

  assert.deepEqual(discordOnboardingSettingsView(connectionId, reloaded.data, selectedChannelIds), {
    connectionId,
    rowId: "settings-1",
    updatedAt: "2026-08-26T12:01:00.000Z",
    ...input,
  });

  const listenerRow = await getListenerOnboardingSettings(listenerStorage(fake.client), creatorId, connectionId);
  assert.deepEqual(listenerOnboardingSettingsInput(listenerRow, selectedChannelIds), input);
});

test("invalid and unselected onboarding channel IDs are rejected before persistence", () => {
  const input = {
    ...defaultDiscordOnboardingSettings(),
    enabled: true,
    sendMode: "auto_send_clear_guide_requests" as const,
    questionChannelId: "channel-not-selected",
  };
  const result = validateDiscordOnboardingSettings(input, selectedChannelIds);
  assert.equal(result.data, null);
  assert.match(result.error ?? "", /selected and saved/);

  const parsed = parseDiscordOnboardingSettingsInput({
    ...input,
    questionChannelId: "x".repeat(25),
  });
  assert.equal(parsed.data, null);
  assert.match(parsed.error ?? "", /valid/);
});

test("no saved onboarding settings return safe defaults", () => {
  const defaults = defaultDiscordOnboardingSettings();
  assert.equal(defaults.enabled, false);
  assert.equal(defaults.sendMode, "draft_only");
  assert.deepEqual(onboardingSettingsInput(null, selectedChannelIds), defaults);
});

test("listener settings loader also uses safe defaults when no row exists", async () => {
  const fake = settingsClient();
  const loaded = await getListenerOnboardingSettings(listenerStorage(fake.client), creatorId, connectionId);
  assert.deepEqual(listenerOnboardingSettingsInput(loaded, selectedChannelIds), defaultDiscordOnboardingSettings());
});

test("reloading settings removes persisted channel IDs that are no longer selected", () => {
  const row = {
    ...emptySettingsRow,
    enabled: true,
    send_mode: "auto_send_clear_guide_requests" as const,
    welcome_channel_id: "channel-announcements",
    question_channel_id: "channel-not-selected",
  };
  const loaded = onboardingSettingsInput(row, ["channel-announcements"]);
  assert.equal(loaded.welcomeChannelId, "channel-announcements");
  assert.equal(loaded.questionChannelId, null);
  assert.equal(loaded.sendMode, "auto_send_clear_guide_requests");
});
