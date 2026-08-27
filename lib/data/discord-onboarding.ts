import "server-only";

import { getCurrentDataAccess } from "@/lib/data/access";
import type { DataResult } from "@/lib/data/types";
import { discordAudienceMemberId, discordInteractionId, discordSourceId } from "@/lib/discord/ids";
import { getDiscordConnection } from "@/lib/data/discord-connection";
import {
  type OnboardingReceiptStatus,
  type OnboardingTriggerType,
} from "@/lib/discord/onboarding-types";
import {
  discordOnboardingSettingsRow,
  validateDiscordOnboardingSettings,
  type DiscordOnboardingSettingsInput,
} from "@/lib/discord/onboarding-settings";
import { readDiscordOnboardingSettings, writeDiscordOnboardingSettings } from "@/lib/discord/onboarding-settings-storage";
import type { Json, Tables, TablesInsert } from "@/lib/supabase/database.types";

export { DEFAULT_BEGINNER_GUIDE_TEXT, defaultDiscordOnboardingSettings, onboardingSettingsInput } from "@/lib/discord/onboarding-settings";
export type { DiscordOnboardingSettingsInput } from "@/lib/discord/onboarding-settings";

export type DiscordOnboardingSettings = Tables<"discord_onboarding_settings">;
export type DiscordOnboardingReceipt = Tables<"discord_onboarding_receipts">;

export interface DiscordOnboardingMemory {
  member: Tables<"audience_members"> | null;
  interactions: Tables<"interactions">[];
  receipts: DiscordOnboardingReceipt[];
}

function emptyAccessResult<T>(access: Awaited<ReturnType<typeof getCurrentDataAccess>>, data: T): DataResult<T> {
  return { data, access: access.status, error: access.status.reason };
}

export async function getDiscordOnboardingSettings(creatorId: string): Promise<DataResult<DiscordOnboardingSettings | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return emptyAccessResult(access, null);
  }
  const connection = await getDiscordConnection(creatorId);
  if (connection.error) return { data: null, access: connection.access, error: connection.error };
  if (!connection.data) return { data: null, access: connection.access, error: null };
  const result = await readDiscordOnboardingSettings(access.client, creatorId, connection.data.id, workspaceId);
  return { data: result.data, access: access.status, error: result.error };
}

export async function saveDiscordOnboardingSettings(
  creatorId: string,
  input: DiscordOnboardingSettingsInput,
): Promise<DataResult<DiscordOnboardingSettings | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) {
    return emptyAccessResult(access, null);
  }
  const connection = await getDiscordConnection(creatorId);
  if (connection.error || !connection.data) {
    return { data: null, access: connection.access, error: connection.error ?? "Connect Discord before configuring onboarding." };
  }
  const selectedIds = new Set(connection.data.selected_channel_ids);
  const validation = validateDiscordOnboardingSettings(input, [...selectedIds]);
  if (validation.error || !validation.data) return { data: null, access: access.status, error: validation.error ?? "Discord onboarding settings are invalid." };
  const result = await writeDiscordOnboardingSettings(
    access.client,
    { ...discordOnboardingSettingsRow(creatorId, connection.data.id, validation.data), workspace_id: workspaceId },
  );
  return { data: result.data, access: access.status, error: result.error };
}

export async function listDiscordOnboardingReceipts(
  creatorId: string,
  limit = 12,
): Promise<DataResult<DiscordOnboardingReceipt[]>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) return emptyAccessResult(access, []);
  const { data, error } = await access.client
    .from("discord_onboarding_receipts")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(50, Math.floor(limit))));
  return { data: data ?? [], access: access.status, error: error?.message ?? null };
}

export async function findRecentDiscordOnboardingReceipt(input: {
  creatorId: string;
  connectionId: string;
  discordUserId: string;
  triggerType: OnboardingTriggerType;
  sourceMessageId: string | null;
}): Promise<DataResult<DiscordOnboardingReceipt | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== input.creatorId) return emptyAccessResult(access, null);
  if (!input.sourceMessageId) return { data: null, access: access.status, error: null };

  const { data, error } = await access.client
    .from("discord_onboarding_receipts")
    .select("*")
    .eq("creator_id", input.creatorId)
    .eq("workspace_id", workspaceId)
    .eq("discord_connection_id", input.connectionId)
    .eq("source_message_id", input.sourceMessageId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function createDiscordOnboardingReceipt(
  receipt: TablesInsert<"discord_onboarding_receipts">,
): Promise<DataResult<DiscordOnboardingReceipt | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== receipt.creator_id) return emptyAccessResult(access, null);
  const { data, error } = await access.client
    .from("discord_onboarding_receipts")
    .insert({ ...receipt, workspace_id: workspaceId })
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function updateDiscordOnboardingReceipt(
  receiptId: string,
  update: Partial<Pick<DiscordOnboardingReceipt, "mind_conversation_id" | "sent_message_id" | "status" | "reason">>,
): Promise<DataResult<DiscordOnboardingReceipt | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId) return emptyAccessResult(access, null);
  const { data, error } = await access.client
    .from("discord_onboarding_receipts")
    .update(update)
    .eq("id", receiptId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();
  return { data, access: access.status, error: error?.message ?? null };
}

export async function getDiscordMemberMemory(
  creatorId: string,
  discordUserId: string,
): Promise<DataResult<DiscordOnboardingMemory>> {
  const access = await getCurrentDataAccess();
  const empty: DiscordOnboardingMemory = { member: null, interactions: [], receipts: [] };
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) return emptyAccessResult(access, empty);
  const memberResult = await access.client
    .from("audience_members")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("workspace_id", workspaceId)
    .eq("platform", "discord")
    .eq("platform_user_id", discordUserId)
    .maybeSingle();
  if (memberResult.error) return { data: empty, access: access.status, error: memberResult.error.message };
  const member = memberResult.data;
  const [interactionsResult, receiptsResult] = await Promise.all([
    member
       ? access.client.from("interactions").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).eq("audience_member_id", member.id).order("published_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [], error: null }),
    access.client.from("discord_onboarding_receipts").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).eq("discord_user_id", discordUserId).order("created_at", { ascending: false }).limit(12),
  ]);
  const error = interactionsResult.error ?? receiptsResult.error;
  return {
    data: { member, interactions: interactionsResult.data ?? [], receipts: receiptsResult.data ?? [] },
    access: access.status,
    error: error?.message ?? null,
  };
}

function isRecord(value: Json): value is Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function listRecentDiscordInteractions(
  creatorId: string,
  channelIds: string[],
  limit = 50,
): Promise<DataResult<Array<{ interaction: Tables<"interactions">; member: Tables<"audience_members"> | null }>>> {
  const access = await getCurrentDataAccess();
  const empty: Array<{ interaction: Tables<"interactions">; member: Tables<"audience_members"> | null }> = [];
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== creatorId) return emptyAccessResult(access, empty);
  if (channelIds.length === 0) return { data: empty, access: access.status, error: null };
  const [interactionsResult, membersResult] = await Promise.all([
    access.client.from("interactions").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).eq("platform", "discord").order("published_at", { ascending: false }).limit(Math.max(1, Math.min(100, limit))),
    access.client.from("audience_members").select("*").eq("creator_id", creatorId).eq("workspace_id", workspaceId).eq("platform", "discord"),
  ]);
  const error = interactionsResult.error ?? membersResult.error;
  if (error) return { data: empty, access: access.status, error: error.message };
  const selected = new Set(channelIds);
  const membersById = new Map((membersResult.data ?? []).map((member) => [member.id, member]));
  return {
    data: (interactionsResult.data ?? [])
      .filter((interaction) => isRecord(interaction.raw_metadata) && typeof interaction.raw_metadata.discord_channel_id === "string" && selected.has(interaction.raw_metadata.discord_channel_id))
      .map((interaction) => ({ interaction, member: membersById.get(interaction.audience_member_id) ?? null })),
    access: access.status,
    error: null,
  };
}

export async function recordOnboardingMemory(input: {
  creatorId: string;
  connectionId: string;
  guildId: string;
  channelId: string;
  channelName: string;
  discordUserId: string;
  discordUsername: string;
  receiptId: string;
  generatedMessage: string;
  status: OnboardingReceiptStatus;
  sentMessageId: string | null;
}): Promise<DataResult<{ interactionId: string } | null>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId || access.creatorId !== input.creatorId) return emptyAccessResult(access, null);
  const now = new Date().toISOString();
  const sourceId = discordSourceId(input.creatorId, input.guildId, input.channelId);
  const source: TablesInsert<"sources"> = {
    id: sourceId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    source_type: "discord_channel",
    external_id: input.channelId,
    title: `#${input.channelName}`,
    url: `https://discord.com/channels/${input.guildId}/${input.channelId}`,
    published_at: null,
    metadata: {
      discord_guild_id: input.guildId,
      discord_channel_id: input.channelId,
      discord_channel_name: input.channelName,
      onboarding_channel: true,
      read_only: true,
    },
  };
  const sourceResult = await access.client.from("sources").upsert(source, { onConflict: "id" }).select("id").single();
  if (sourceResult.error || !sourceResult.data) return { data: null, access: access.status, error: sourceResult.error?.message ?? "The onboarding source could not be saved." };

  const memberId = discordAudienceMemberId(input.creatorId, input.discordUserId);
  const existingMember = await access.client.from("audience_members").select("first_seen_at, last_seen_at").eq("id", memberId).eq("creator_id", input.creatorId).eq("workspace_id", workspaceId).maybeSingle();
  if (existingMember.error) return { data: null, access: access.status, error: existingMember.error.message };
  const member: TablesInsert<"audience_members"> = {
    id: memberId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    platform: "discord",
    platform_user_id: input.discordUserId,
    display_name: input.discordUsername,
    avatar_url: null,
    first_seen_at: existingMember.data?.first_seen_at ?? now,
    last_seen_at: existingMember.data?.last_seen_at && existingMember.data.last_seen_at > now ? existingMember.data.last_seen_at : now,
  };
  const memberResult = await access.client.from("audience_members").upsert(member, { onConflict: "id" });
  if (memberResult.error) return { data: null, access: access.status, error: memberResult.error.message };

  const interactionId = discordInteractionId(input.creatorId, `onboarding:${input.receiptId}`);
  const interaction: TablesInsert<"interactions"> = {
    id: interactionId,
    creator_id: input.creatorId,
    workspace_id: workspaceId,
    audience_member_id: memberId,
    source_id: sourceId,
    platform: "discord",
    interaction_type: "creator_reply",
    external_id: `onboarding:${input.receiptId}`,
    text: input.generatedMessage,
    published_at: now,
    creator_replied: true,
    parent_interaction_id: null,
    like_count: null,
    reply_count: null,
    raw_metadata: {
      onboarding_receipt_id: input.receiptId,
      onboarding_status: input.status,
      discord_connection_id: input.connectionId,
      discord_guild_id: input.guildId,
      discord_channel_id: input.channelId,
      discord_user_id: input.discordUserId,
      sent_message_id: input.sentMessageId,
      read_only_import: true,
    },
  };
  const interactionResult = await access.client.from("interactions").upsert(interaction, { onConflict: "id" });
  if (interactionResult.error) return { data: null, access: access.status, error: interactionResult.error.message };
  return { data: { interactionId }, access: access.status, error: null };
}

export async function updateOnboardingMemoryStatus(
  interactionId: string,
  status: OnboardingReceiptStatus,
  sentMessageId: string | null,
): Promise<DataResult<boolean>> {
  const access = await getCurrentDataAccess();
  const workspaceId = access.workspaceId;
  if (!access.client || !workspaceId) return emptyAccessResult(access, false);
  const existing = await access.client.from("interactions").select("raw_metadata").eq("id", interactionId).eq("workspace_id", workspaceId).maybeSingle();
  if (existing.error) return { data: false, access: access.status, error: existing.error.message };
  const rawMetadata = existing.data?.raw_metadata;
  const metadata: Record<string, Json | undefined> = rawMetadata && isRecord(rawMetadata) ? rawMetadata : {};
  const { error } = await access.client.from("interactions").update({
    raw_metadata: { ...metadata, onboarding_status: status, sent_message_id: sentMessageId },
  }).eq("id", interactionId).eq("workspace_id", workspaceId);
  return { data: !error, access: access.status, error: error?.message ?? null };
}
