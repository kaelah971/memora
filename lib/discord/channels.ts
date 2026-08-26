export interface DiscordReadableChannel {
  id: string;
  name: string;
  type: number;
  canRead: boolean;
  selected: boolean;
}

export function selectConnectedChannelIds(
  requestedIds: string[],
  availableChannels: DiscordReadableChannel[],
): { selected: string[]; invalid: string[] } {
  const available = new Map(availableChannels.filter((channel) => channel.canRead).map((channel) => [channel.id, channel]));
  const uniqueRequested = [...new Set(requestedIds.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim()))];
  return {
    selected: uniqueRequested.filter((id) => available.has(id)),
    invalid: uniqueRequested.filter((id) => !available.has(id)),
  };
}
