import { createAuthenticatedMindsClient } from "@/lib/minds/client";
import { readMindsConfig } from "@/lib/minds/config";
import { MindsIntegrationError } from "@/lib/minds/errors";
import {
  buildDiscordOnboardingPrompt,
  cleanAndValidateOnboardingMessage,
  type DiscordOnboardingPromptInput,
} from "@/lib/discord/onboarding";
import { sendAndPollForMindReply } from "@/lib/minds/reply";

export interface DiscordOnboardingGeneration {
  message: string;
  mindId: string;
  conversationId: string;
  prompt: string;
}

export async function generateDiscordOnboardingMessage(
  input: DiscordOnboardingPromptInput,
): Promise<DiscordOnboardingGeneration> {
  const config = readMindsConfig();
  const alias = input.conversationAlias?.trim() || config.alias;
  const client = createAuthenticatedMindsClient(config);
  const mind = await client.getMind(config.mindId);
  if (mind.isEnabled === false) {
    throw new MindsIntegrationError("API", "The configured Memora Mind is disabled.", { status: 503 });
  }
  const conversation = await client.ensureConversation(alias, config.mindId);
  const resolvedMindId = await client.getMindIdForAlias(alias);
  if (resolvedMindId && resolvedMindId !== config.mindId) {
    throw new MindsIntegrationError("API", "The configured Memora Mind alias resolved to a different Mind.", { status: 409 });
  }
  const prompt = buildDiscordOnboardingPrompt(input);
  const capture = await sendAndPollForMindReply(client, alias, prompt);
  if (!capture.response) {
    throw new MindsIntegrationError("TIMEOUT", "Memora Mind did not return onboarding guidance before the safe timeout.", { status: 504 });
  }
  let message: string;
  try {
    message = cleanAndValidateOnboardingMessage(capture.response, input.channels, input.beginnerGuideText);
  } catch (error) {
    throw new MindsIntegrationError(
      "API",
      error instanceof Error ? error.message : "Memora Mind returned onboarding guidance that could not be validated.",
      { status: 502 },
    );
  }
  return { message, mindId: config.mindId, conversationId: conversation.conversationId, prompt };
}
