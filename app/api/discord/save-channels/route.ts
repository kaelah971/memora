import { NextResponse } from "next/server";

import { saveDiscordSelectedChannels } from "@/lib/data/discord-connection";
import { getDevelopmentCreator } from "@/lib/youtube/server";
import { toDiscordIntegrationError } from "@/lib/discord/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { channelIds?: unknown };
    const channelIds = Array.isArray(body.channelIds) && body.channelIds.every((id) => typeof id === "string")
      ? body.channelIds as string[]
      : null;
    if (!channelIds || channelIds.length > 50) return NextResponse.json({ error: "A valid channel selection is required." }, { status: 400 });
    const creator = await getDevelopmentCreator();
    const result = await saveDiscordSelectedChannels(creator.id, channelIds);
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Discord channels could not be saved." }, { status: 400 });
    return NextResponse.json({ connection: { guildId: result.data.guild_id, guildName: result.data.guild_name, selectedChannelIds: result.data.selected_channel_ids } });
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return NextResponse.json({ error: safeError.message, code: safeError.code }, { status: safeError.status });
  }
}
