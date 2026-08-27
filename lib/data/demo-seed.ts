import type { TablesInsert } from "@/lib/supabase/database.types";
import type { DataClient } from "@/lib/data/types";

export const DEMO_IDS = {
  workspace: "00000000-0000-4000-8000-000000000001",
  creator: "10000000-0000-4000-8000-000000000001",
  sourceLivestream: "20000000-0000-4000-8000-000000000001",
  sourceMayaSetup: "20000000-0000-4000-8000-000000000002",
  sourceMayaWorkflow: "20000000-0000-4000-8000-000000000003",
  sourceMayaTools: "20000000-0000-4000-8000-000000000004",
  sourceAlexWorkflow: "20000000-0000-4000-8000-000000000005",
  alex: "30000000-0000-4000-8000-000000000001",
  maya: "30000000-0000-4000-8000-000000000002",
  jordan: "30000000-0000-4000-8000-000000000003",
  alexQuestion: "40000000-0000-4000-8000-000000000001",
  jordanQuestion: "40000000-0000-4000-8000-000000000002",
  alexLivestreamInteraction: "50000000-0000-4000-8000-000000000001",
  mayaSetupInteraction: "50000000-0000-4000-8000-000000000002",
  mayaWorkflowInteraction: "50000000-0000-4000-8000-000000000003",
  mayaToolsInteraction: "50000000-0000-4000-8000-000000000004",
  jordanLivestreamInteraction: "50000000-0000-4000-8000-000000000005",
  creatorEvent: "60000000-0000-4000-8000-000000000001",
} as const;

const timestamps = {
  alexQuestion: "2026-08-03T20:42:18.000Z",
  mayaSetup: "2026-08-08T11:06:00.000Z",
  mayaWorkflow: "2026-08-14T09:30:00.000Z",
  mayaTools: "2026-08-19T14:20:00.000Z",
  jordanQuestion: "2026-08-19T18:40:00.000Z",
  creatorEvent: "2026-08-23T10:00:00.000Z",
} as const;

export interface DemoSeedSummary {
  creators: number;
  sources: number;
  audienceMembers: number;
  interactions: number;
  unresolvedQuestions: number;
  creatorEvents: number;
  creatorActions: number;
}

export async function seedDemoData(client: DataClient): Promise<DemoSeedSummary> {
  const creator: TablesInsert<"creators"> = {
    id: DEMO_IDS.creator,
    workspace_id: DEMO_IDS.workspace,
    display_name: "Memora Demo Creator",
    slug: "memora-demo",
    timezone: "UTC",
  };
  const sources: TablesInsert<"sources">[] = [
    {
      id: DEMO_IDS.sourceLivestream,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube_live",
      source_type: "livestream",
      external_id: "demo-livestream-2026-08-03",
      title: "Creator Q&A Livestream",
      published_at: "2026-08-03T20:00:00.000Z",
      metadata: { demo: true, source_label: "YouTube Live" },
    },
    {
      id: DEMO_IDS.sourceMayaSetup,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube",
      source_type: "video",
      external_id: "demo-video-setup",
      title: "Creator Setup Q&A",
      published_at: "2026-08-08T10:00:00.000Z",
      metadata: { demo: true },
    },
    {
      id: DEMO_IDS.sourceMayaWorkflow,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube",
      source_type: "video",
      external_id: "demo-video-workflow",
      title: "A Calm Editing Workflow",
      published_at: "2026-08-14T09:00:00.000Z",
      metadata: { demo: true },
    },
    {
      id: DEMO_IDS.sourceMayaTools,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube",
      source_type: "video",
      external_id: "demo-video-tools",
      title: "Tools I Actually Use",
      published_at: "2026-08-19T14:00:00.000Z",
      metadata: { demo: true },
    },
    {
      id: DEMO_IDS.sourceAlexWorkflow,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "manual",
      source_type: "demo_dataset",
      external_id: "demo-content-beginner-editing-workflow",
      title: "My Beginner Editing Workflow",
      published_at: timestamps.creatorEvent,
      metadata: { demo: true, event_only: true },
    },
  ];
  const audienceMembers: TablesInsert<"audience_members">[] = [
    {
      id: DEMO_IDS.alex,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube_live",
      platform_user_id: "demo-youtube-alex",
      display_name: "Alex",
      first_seen_at: timestamps.alexQuestion,
      last_seen_at: timestamps.alexQuestion,
    },
    {
      id: DEMO_IDS.maya,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube",
      platform_user_id: "demo-youtube-maya",
      display_name: "Maya",
      first_seen_at: timestamps.mayaSetup,
      last_seen_at: timestamps.mayaTools,
    },
    {
      id: DEMO_IDS.jordan,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      platform: "youtube_live",
      platform_user_id: "demo-youtube-jordan",
      display_name: "Jordan",
      first_seen_at: timestamps.jordanQuestion,
      last_seen_at: timestamps.jordanQuestion,
    },
  ];
  const interactions: TablesInsert<"interactions">[] = [
    {
      id: DEMO_IDS.alexLivestreamInteraction,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.alex,
      source_id: DEMO_IDS.sourceLivestream,
      platform: "youtube_live",
      interaction_type: "livestream_message",
      external_id: "demo-alex-livestream-question",
      text: "What editing software should beginners use?",
      published_at: timestamps.alexQuestion,
      creator_replied: false,
      raw_metadata: { demo: true, timestamp_label: "42:18" },
    },
    {
      id: DEMO_IDS.mayaSetupInteraction,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.maya,
      source_id: DEMO_IDS.sourceMayaSetup,
      platform: "youtube",
      interaction_type: "comment",
      external_id: "demo-maya-setup-comment",
      text: "Your tutorials are helpful, but I still get confused during setup.",
      published_at: timestamps.mayaSetup,
      creator_replied: true,
      raw_metadata: { demo: true },
    },
    {
      id: DEMO_IDS.mayaWorkflowInteraction,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.maya,
      source_id: DEMO_IDS.sourceMayaWorkflow,
      platform: "youtube",
      interaction_type: "comment",
      external_id: "demo-maya-workflow-comment",
      text: "The slower walkthrough made the workflow much easier to follow.",
      published_at: timestamps.mayaWorkflow,
      creator_replied: true,
      raw_metadata: { demo: true },
    },
    {
      id: DEMO_IDS.mayaToolsInteraction,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.maya,
      source_id: DEMO_IDS.sourceMayaTools,
      platform: "youtube",
      interaction_type: "comment",
      external_id: "demo-maya-tools-comment",
      text: "I appreciate that you explain why each tool belongs in the workflow.",
      published_at: timestamps.mayaTools,
      creator_replied: true,
      raw_metadata: { demo: true },
    },
    {
      id: DEMO_IDS.jordanLivestreamInteraction,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.jordan,
      source_id: DEMO_IDS.sourceLivestream,
      platform: "youtube_live",
      interaction_type: "livestream_message",
      external_id: "demo-jordan-livestream-question",
      text: "Will you share the toolkit you use for client projects?",
      published_at: timestamps.jordanQuestion,
      creator_replied: false,
      raw_metadata: { demo: true, timestamp_label: "18:40" },
    },
  ];
  const questions: TablesInsert<"unresolved_questions">[] = [
    {
      id: DEMO_IDS.alexQuestion,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.alex,
      interaction_id: DEMO_IDS.alexLivestreamInteraction,
      question_text: "What editing software should beginners use?",
      status: "open",
    },
    {
      id: DEMO_IDS.jordanQuestion,
      creator_id: DEMO_IDS.creator,
      workspace_id: DEMO_IDS.workspace,
      audience_member_id: DEMO_IDS.jordan,
      interaction_id: DEMO_IDS.jordanLivestreamInteraction,
      question_text: "Will you share the toolkit you use for client projects?",
      status: "open",
    },
  ];
  const creatorEvent: TablesInsert<"creator_events"> = {
    id: DEMO_IDS.creatorEvent,
    creator_id: DEMO_IDS.creator,
    workspace_id: DEMO_IDS.workspace,
    event_type: "content_published",
    source_id: DEMO_IDS.sourceAlexWorkflow,
    external_id: "demo-event-beginner-editing-workflow",
    title: "My Beginner Editing Workflow",
    description: "A manual demo event representing newly published creator content.",
    occurred_at: timestamps.creatorEvent,
    payload: { demo: true, topic: "beginner editing software and workflow" },
  };

  const creatorResult = await client.from("creators").upsert(creator, { onConflict: "id" });
  if (creatorResult.error) throw new Error(`creators: ${creatorResult.error.message}`);
  const sourcesResult = await client.from("sources").upsert(sources, { onConflict: "id" });
  if (sourcesResult.error) throw new Error(`sources: ${sourcesResult.error.message}`);
  const audienceResult = await client
    .from("audience_members")
    .upsert(audienceMembers, { onConflict: "id" });
  if (audienceResult.error) throw new Error(`audience_members: ${audienceResult.error.message}`);
  const interactionsResult = await client
    .from("interactions")
    .upsert(interactions, { onConflict: "id" });
  if (interactionsResult.error) throw new Error(`interactions: ${interactionsResult.error.message}`);
  const questionsResult = await client
    .from("unresolved_questions")
    .upsert(questions, { onConflict: "id" });
  if (questionsResult.error) throw new Error(`unresolved_questions: ${questionsResult.error.message}`);
  const eventResult = await client
    .from("creator_events")
    .upsert(creatorEvent, { onConflict: "id" });
  if (eventResult.error) throw new Error(`creator_events: ${eventResult.error.message}`);

  return {
    creators: 1,
    sources: sources.length,
    audienceMembers: audienceMembers.length,
    interactions: interactions.length,
    unresolvedQuestions: questions.length,
    creatorEvents: 1,
    creatorActions: 0,
  };
}
