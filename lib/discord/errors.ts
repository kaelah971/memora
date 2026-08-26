import { DiscordConfigError } from "@/lib/discord/config";

export type DiscordIntegrationErrorCode =
  | "CONFIGURATION"
  | "AUTH_REQUIRED"
  | "GUILD_NOT_FOUND"
  | "CHANNEL_NOT_FOUND"
  | "RATE_LIMITED"
  | "API"
  | "STORAGE"
  | "INVALID_REQUEST";

export class DiscordIntegrationError extends Error {
  readonly code: DiscordIntegrationErrorCode;
  readonly status: number;

  constructor(code: DiscordIntegrationErrorCode, message: string, status = 500) {
    super(message);
    this.name = "DiscordIntegrationError";
    this.code = code;
    this.status = status;
  }
}

export function toDiscordIntegrationError(error: unknown): DiscordIntegrationError {
  if (error instanceof DiscordIntegrationError) return error;
  if (error instanceof DiscordConfigError) return new DiscordIntegrationError("CONFIGURATION", error.message, 503);
  if (error instanceof Error) return new DiscordIntegrationError("API", "Discord could not be reached. Try again.", 502);
  return new DiscordIntegrationError("API", "Discord could not be reached. Try again.", 502);
}
