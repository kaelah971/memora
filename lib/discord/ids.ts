import type { DiscordChannel } from "@/lib/discord/client";
import { deterministicYouTubeUuid } from "@/lib/youtube/ids";

export function discordSourceId(creatorId: string, guildId: string, channelId: string): string {
  return deterministicYouTubeUuid(`source:${creatorId}:discord:${guildId}:${channelId}`);
}

export function discordAudienceMemberId(creatorId: string, authorId: string): string {
  return deterministicYouTubeUuid(`audience:${creatorId}:discord:${authorId}`);
}

export function discordInteractionId(creatorId: string, messageId: string): string {
  return deterministicYouTubeUuid(`interaction:${creatorId}:discord:${messageId}`);
}

export function discordCreatorEventId(creatorId: string, messageId: string): string {
  return deterministicYouTubeUuid(`creator-event:${creatorId}:discord:${messageId}`);
}

export function isAnnouncementChannel(channel: DiscordChannel): boolean {
  return channel.type === 5 || channel.name?.trim().toLowerCase() === "announcements";
}
