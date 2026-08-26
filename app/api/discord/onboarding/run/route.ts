import { NextResponse } from "next/server";

import { runManualDiscordOnboardingTest } from "@/lib/discord/onboarding-service";
import { isOnboardingTriggerType } from "@/lib/discord/onboarding-types";
import { getDevelopmentCreator } from "@/lib/youtube/server";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: unknown; triggerType?: unknown };
    const username = typeof body.username === "string" ? body.username.trim().slice(0, 100) : "New member";
    const triggerType = body.triggerType === "member_join" ? "member_join" : body.triggerType === "manual_test" ? "manual_test" : null;
    if (!username || !triggerType || !isOnboardingTriggerType(triggerType)) {
      return NextResponse.json({ error: "Provide a member handle and a supported onboarding test trigger." }, { status: 400 });
    }
    const creator = await getDevelopmentCreator();
    const result = await runManualDiscordOnboardingTest(creator.id, { username, triggerType });
    if (result.error || !result.data) return NextResponse.json({ error: result.error ?? "The onboarding test could not be completed." }, { status: 400 });
    return NextResponse.json({ receipt: result.data });
  } catch {
    return NextResponse.json({ error: "The onboarding test could not be completed." }, { status: 400 });
  }
}
