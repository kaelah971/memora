import { randomBytes, timingSafeEqual } from "node:crypto";

export const YOUTUBE_OAUTH_STATE_COOKIE = "memora_youtube_oauth_state";

export function createOAuthState(): string {
  return randomBytes(32).toString("hex");
}

export function isValidOAuthState(expected: string | undefined, received: string | undefined): boolean {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
