import { NextResponse } from "next/server";

import { getDiscordConnection } from "@/lib/data/discord-connection";
import { getDiscordOnboardingSettings, saveDiscordOnboardingSettings } from "@/lib/data/discord-onboarding";
import {
  discordOnboardingSettingsView,
  parseDiscordOnboardingSettingsInput,
  type DiscordOnboardingSettings,
} from "@/lib/discord/onboarding-settings";
import { getDevelopmentCreator } from "@/lib/youtube/server";

export const dynamic = "force-dynamic";

function settingsView(
  settings: DiscordOnboardingSettings | null,
  connectionId: string,
  selectedChannelIds?: readonly string[],
) {
  return discordOnboardingSettingsView(connectionId, settings, selectedChannelIds);
}

export async function GET() {
  try {
    const creator = await getDevelopmentCreator();
    const connection = await getDiscordConnection(creator.id);
    if (connection.error) return NextResponse.json({ error: connection.error }, { status: 500 });
    if (!connection.data) return NextResponse.json({ settings: null });
    const settings = await getDiscordOnboardingSettings(creator.id);
    if (settings.error) return NextResponse.json({ error: settings.error }, { status: 500 });
    return NextResponse.json({ settings: settingsView(settings.data, connection.data.id, connection.data.selected_channel_ids) });
  } catch {
    return NextResponse.json({ error: "Discord onboarding settings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const parsed = parseDiscordOnboardingSettingsInput(await request.json());
    if (parsed.error || !parsed.data) return NextResponse.json({ error: parsed.error ?? "Provide valid Discord onboarding settings." }, { status: 400 });
    const creator = await getDevelopmentCreator();
    const result = await saveDiscordOnboardingSettings(creator.id, parsed.data);
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Discord onboarding settings could not be saved." }, { status: 400 });
    return NextResponse.json({ settings: settingsView(result.data, result.data.discord_connection_id) });
  } catch {
    return NextResponse.json({ error: "Discord onboarding settings could not be saved." }, { status: 400 });
  }
}
