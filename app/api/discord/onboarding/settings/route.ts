import { NextResponse } from "next/server";

import { getDiscordConnection } from "@/lib/data/discord-connection";
import {
  defaultDiscordOnboardingSettings,
  getDiscordOnboardingSettings,
  saveDiscordOnboardingSettings,
  type DiscordOnboardingSettingsInput,
} from "@/lib/data/discord-onboarding";
import { getDevelopmentCreator } from "@/lib/youtube/server";
import { isOnboardingSendMode } from "@/lib/discord/onboarding-types";

function settingsView(settings: DiscordOnboardingSettingsInput | null, connectionId: string) {
  const value = settings ?? defaultDiscordOnboardingSettings();
  return { connectionId, ...value };
}

function stringOrNull(value: unknown): string | null {
  if (value === null || value === "") return null;
  return typeof value === "string" && value.length <= 24 ? value : null;
}

function settingsInput(body: Record<string, unknown>): DiscordOnboardingSettingsInput | null {
  const sendMode = body.sendMode;
  if (typeof body.enabled !== "boolean" || !isOnboardingSendMode(sendMode) || typeof body.beginnerGuideText !== "string") return null;
  const fields = ["welcomeChannelId", "resourceChannelId", "questionChannelId", "supportChannelId", "builderChannelId"] as const;
  const channels = Object.fromEntries(fields.map((field) => [field, stringOrNull(body[field])])) as Pick<DiscordOnboardingSettingsInput, typeof fields[number]>;
  if (fields.some((field) => body[field] !== null && body[field] !== "" && channels[field] === null)) return null;
  return { enabled: body.enabled, sendMode, beginnerGuideText: body.beginnerGuideText, ...channels };
}

export async function GET() {
  try {
    const creator = await getDevelopmentCreator();
    const connection = await getDiscordConnection(creator.id);
    if (connection.error) return NextResponse.json({ error: connection.error }, { status: 500 });
    if (!connection.data) return NextResponse.json({ settings: null });
    const settings = await getDiscordOnboardingSettings(creator.id);
    if (settings.error) return NextResponse.json({ error: settings.error }, { status: 500 });
    return NextResponse.json({ settings: settingsView(settings.data ? {
      enabled: settings.data.enabled,
      sendMode: settings.data.send_mode,
      welcomeChannelId: settings.data.welcome_channel_id,
      resourceChannelId: settings.data.resource_channel_id,
      questionChannelId: settings.data.question_channel_id,
      supportChannelId: settings.data.support_channel_id,
      builderChannelId: settings.data.builder_channel_id,
      beginnerGuideText: settings.data.beginner_guide_text,
    } : null, connection.data.id) });
  } catch {
    return NextResponse.json({ error: "Discord onboarding settings could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const input = settingsInput(body);
    if (!input) return NextResponse.json({ error: "Provide valid Discord onboarding settings." }, { status: 400 });
    const creator = await getDevelopmentCreator();
    const result = await saveDiscordOnboardingSettings(creator.id, input);
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "Discord onboarding settings could not be saved." }, { status: 400 });
    return NextResponse.json({ settings: settingsView(input, result.data.discord_connection_id) });
  } catch {
    return NextResponse.json({ error: "Discord onboarding settings could not be saved." }, { status: 400 });
  }
}
