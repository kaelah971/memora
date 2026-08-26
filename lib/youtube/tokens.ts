import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { YouTubeIntegrationError } from "@/lib/youtube/errors";
import type { YouTubeConnectionRecord, YouTubeTokenState } from "@/lib/youtube/types";

function decodeEncryptionKey(value: string): Buffer {
  const trimmed = value.trim();
  const hex = /^[0-9a-f]{64}$/i.test(trimmed) ? Buffer.from(trimmed, "hex") : null;
  const base64 = Buffer.from(trimmed, "base64");
  const key = hex ?? (base64.length === 32 ? base64 : null);
  if (!key || key.length !== 32) {
    throw new YouTubeIntegrationError("token_storage_invalid", 500);
  }
  return key;
}

function encode(value: Buffer): string {
  return value.toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export function encryptYouTubeToken(value: string, encryptionKey: string): string {
  const key = decodeEncryptionKey(encryptionKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1.${encode(iv)}.${encode(ciphertext)}.${encode(cipher.getAuthTag())}`;
}

export function decryptYouTubeToken(value: string, encryptionKey: string): string {
  const [version, ivValue, ciphertextValue, tagValue] = value.split(".");
  if (version !== "v1" || !ivValue || !ciphertextValue || !tagValue) {
    throw new YouTubeIntegrationError("token_storage_invalid", 500);
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", decodeEncryptionKey(encryptionKey), decode(ivValue));
    decipher.setAuthTag(decode(tagValue));
    return Buffer.concat([decipher.update(decode(ciphertextValue)), decipher.final()]).toString("utf8");
  } catch {
    throw new YouTubeIntegrationError("token_storage_invalid", 500);
  }
}

export function getYouTubeTokenState(connection: YouTubeConnectionRecord): YouTubeTokenState {
  try {
    if (!connection.access_token_ciphertext) return "unavailable";
    if (connection.token_expires_at && new Date(connection.token_expires_at).getTime() <= Date.now()) {
      return connection.refresh_token_ciphertext ? "refreshable" : "expired";
    }
    return "valid";
  } catch {
    return "unavailable";
  }
}
