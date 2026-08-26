import { MindsApiError } from "@animocabrands/minds-client-lib";

import { MindsConfigError } from "@/lib/minds/config";
import type { MindsErrorInfo } from "@/lib/minds/types";

export type MindsIntegrationErrorCode =
  | "CONFIGURATION"
  | "API"
  | "TIMEOUT"
  | "EMPTY_RESPONSE"
  | "CONTINUITY_NOT_VERIFIED"
  | "STORAGE";

export class MindsIntegrationError extends Error {
  readonly code: MindsIntegrationErrorCode;
  readonly status: number | null;
  readonly requestId: string | null;

  constructor(
    code: MindsIntegrationErrorCode,
    message: string,
    options: { status?: number | null; requestId?: string | null } = {},
  ) {
    super(message);
    this.name = "MindsIntegrationError";
    this.code = code;
    this.status = options.status ?? null;
    this.requestId = options.requestId ?? null;
  }
}

function stripSecret(message: string, secret?: string): string {
  if (!secret) return message;
  return message.split(secret).join("[REDACTED]");
}

export function toMindsErrorInfo(error: unknown, secret?: string): MindsErrorInfo {
  if (error instanceof MindsIntegrationError) {
    return {
      code: error.code,
      message: stripSecret(error.message, secret),
      status: error.status,
      requestId: error.requestId,
    };
  }

  if (error instanceof MindsConfigError) {
    return {
      code: "CONFIGURATION",
      message: stripSecret(error.message, secret),
      status: null,
      requestId: null,
    };
  }

  if (error instanceof MindsApiError) {
    return {
      code: error.code || "API",
      message: stripSecret(error.message, secret),
      status: error.status,
      requestId: error.requestId ?? null,
    };
  }

  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: stripSecret(error.message, secret),
      status: null,
      requestId: null,
    };
  }

  return {
    code: "UNKNOWN",
    message: "Minds request failed with an unknown error.",
    status: null,
    requestId: null,
  };
}
