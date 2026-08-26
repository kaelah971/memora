"use server";

import { revalidatePath } from "next/cache";

import { getCreatorWorkspace, updateCreatorVoicePreference } from "@/lib/data/creators";
import { isCreatorVoice, type CreatorVoice } from "@/types/data";

export async function saveCreatorVoice(value: unknown): Promise<{
  ok: boolean;
  voice?: CreatorVoice;
  error?: string;
}> {
  if (!isCreatorVoice(value)) return { ok: false, error: "Choose one of the available creator voices." };

  const creatorResult = await getCreatorWorkspace();
  if (!creatorResult.access.available || !creatorResult.data) {
    return { ok: false, error: creatorResult.error ?? "The creator workspace is not available." };
  }

  const result = await updateCreatorVoicePreference(creatorResult.data.id, value);
  if (result.error || !result.data) return { ok: false, error: result.error ?? "The creator voice could not be saved." };

  revalidatePath("/app/settings");
  revalidatePath("/app/follow-up");
  revalidatePath("/app/proof");
  return { ok: true, voice: result.data };
}
