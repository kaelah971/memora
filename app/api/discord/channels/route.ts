import { NextResponse } from "next/server";

import { listDiscordConnectionChannels } from "@/lib/data/discord-connection";
import { getDevelopmentCreator } from "@/lib/youtube/server";
import { toDiscordIntegrationError } from "@/lib/discord/errors";

export async function GET() {
  try {
    const creator = await getDevelopmentCreator();
    const result = await listDiscordConnectionChannels(creator.id);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.data.length === 0 ? 404 : 502 });
    return NextResponse.json({ channels: result.data });
  } catch (error) {
    const safeError = toDiscordIntegrationError(error);
    return NextResponse.json({ error: safeError.message, code: safeError.code }, { status: safeError.status });
  }
}
