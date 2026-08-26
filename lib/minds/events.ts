import type { AudienceEvent, CreatorEvent } from "@/lib/minds/types";

const instruction =
  "Retain the meaningful relationship context from this interaction for future Memora reasoning. Do not invent facts not present in the event.";

function cleanValue(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function serializeAudienceEvent(event: AudienceEvent): string {
  return [
    "MEMORA AUDIENCE EVENT",
    ...(event.runId ? [`run_id: ${cleanValue(event.runId)}`] : []),
    ...(event.eventId ? [`event_id: ${cleanValue(event.eventId)}`] : []),
    ...(event.sourceId ? [`source_id: ${cleanValue(event.sourceId)}`] : []),
    `event_type: ${cleanValue(event.eventType)}`,
    `viewer_id: ${cleanValue(event.viewerId)}`,
    `viewer_name: ${cleanValue(event.viewerName)}`,
    `source: ${cleanValue(event.source)}`,
    `source_date: ${cleanValue(event.sourceDate)}`,
    `message: ${cleanValue(event.message)}`,
    `creator_replied: ${event.creatorReplied ? "true" : "false"}`,
    `relationship_state: ${cleanValue(event.relationshipState)}`,
    `instruction: ${instruction}`,
  ].join("\n");
}

export function serializeCreatorEvent(event: CreatorEvent): string {
  return [
    "MEMORA CREATOR EVENT",
    ...(event.runId ? [`run_id: ${cleanValue(event.runId)}`] : []),
    ...(event.eventId ? [`event_id: ${cleanValue(event.eventId)}`] : []),
    ...(event.sourceId ? [`source_id: ${cleanValue(event.sourceId)}`] : []),
    `event_type: ${cleanValue(event.eventType)}`,
    `title: ${cleanValue(event.title)}`,
    `published_date: ${cleanValue(event.publishedDate)}`,
    `topic: ${cleanValue(event.topic)}`,
    "instruction: Based on relevant audience context you remember from earlier interactions, identify the remembered viewer, summarize the earlier question or context, explain why this new content creates a follow-up opportunity, and state the suggested creator action.",
  ].join("\n");
}

export function createSpikeEvents(runId: string): {
  audience: AudienceEvent;
  creator: CreatorEvent;
} {
  return {
    audience: {
      runId,
      eventId: `${runId}-audience-event-1`,
      sourceId: `${runId}-youtube-live`,
      eventType: "LIVESTREAM_MESSAGE",
      viewerId: `${runId}-viewer-alex`,
      viewerName: "Alex",
      source: "YouTube Live",
      sourceDate: "2026-08-03",
      message: `What editing software should beginners use? Continuity spike run ${runId}.`,
      creatorReplied: false,
      relationshipState: "OPEN_QUESTION",
    },
    creator: {
      runId,
      eventId: `${runId}-creator-event-2`,
      sourceId: `${runId}-youtube-video`,
      eventType: "NEW_CONTENT",
      title: "My Beginner Editing Workflow",
      publishedDate: "2026-08-23",
      topic: "beginner editing software and workflow",
    },
  };
}
