import { randomBytes, timingSafeEqual } from "node:crypto";

export const DISCORD_OAUTH_STATE_COOKIE = "memora_discord_oauth_state";

export function createDiscordOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function isValidDiscordOAuthState(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
