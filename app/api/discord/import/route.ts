import { NextResponse } from "next/server";

import { listFollowUpOpportunities } from "@/lib/data/follow-up-opportunities";
import { getDiscordConnection, getSavedDiscordImportConfig, markDiscordConnectionImported } from "@/lib/data/discord-connection";
import { processDiscordOnboarding } from "@/lib/discord/onboarding-service";
import { getDevelopmentCreator } from "@/lib/youtube/server";
import { DiscordIntegrationError, getDiscordConfigStatus, importDiscordMessages, readDiscordConfig, toDiscordIntegrationError } from "@/lib/discord/server";

export async function POST() {
  try {
    const creator = await getDevelopmentCreator();
    const connection = await getDiscordConnection(creator.id);
    if (connection.error) throw new DiscordIntegrationError("STORAGE", connection.error, 500);
    let config;
    if (connection.data) {
      const savedConfig = await getSavedDiscordImportConfig(creator.id);
      if (savedConfig.error || !savedConfig.data) throw new DiscordIntegrationError("INVALID_REQUEST", savedConfig.error ?? "Save Discord channels before importing.", 400);
      config = savedConfig.data;
    } else {
      config = readDiscordConfig();
    }
    const summary = await importDiscordMessages(creator.id, config);
    if (connection.data) await markDiscordConnectionImported(creator.id);
    const onboarding = connection.data
      ? await processDiscordOnboarding(creator.id)
      : { data: null, error: null };
    const queue = await listFollowUpOpportunities(creator.id);
    const opportunitiesFound = queue.error
      ? 0
      : queue.data.opportunities.filter((opportunity) => opportunity.sourcePlatform === "discord").length;
    return NextResponse.json({
      summary: { ...summary, opportunitiesFound },
      config: getDiscordConfigStatus(),
      connection: connection.data
        ? { guildId: connection.data.guild_id, guildName: connection.data.guild_name, selectedChannelIds: connection.data.selected_channel_ids }
        : null,
      onboarding: onboarding.data,
      onboardingError: onboarding.error,
    });
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return NextResponse.json(
      { error: safeError.message, code: safeError.code },
      { status: safeError.status },
    );
  }
}
