import type {
  DemoAudienceMember,
  MemoryThreadNode,
} from "@/types/memora";

export const alex = {
  id: "alex",
  name: "Alex",
  descriptor: "Returning viewer",
  sourceCount: "2 source moments",
  status: "ready",
  facts: ["Interested in editing workflows", "1 open question"],
  primaryInteraction: {
    id: "alex-livestream",
    platform: "LIVESTREAM",
    date: "AUG 03",
    isoDate: "2024-08-03",
    timestamp: "42:18",
    quote: "What editing software should beginners use?",
    context: "Question left open after the livestream.",
  },
  secondaryInteraction: {
    id: "alex-youtube",
    platform: "YOUTUBE",
    date: "AUG 12",
    isoDate: "2024-08-12",
    timestamp: "09:14",
    quote: "Still trying to find a beginner-friendly editing workflow.",
    context: "A second signal from the same conversation.",
  },
  openLoop: "Beginner editing software question",
  nextAction: "Review follow-up with the new video",
  note: "The new workflow video gives this old question somewhere to go.",
} satisfies DemoAudienceMember;

export const maya = {
  id: "maya",
  name: "Maya",
  descriptor: "Thoughtful recurring feedback",
  sourceCount: "3 source moments",
  status: "remembered",
  facts: ["Commented on 3 recent videos", "Setup questions recur"],
  primaryInteraction: {
    id: "maya-youtube",
    platform: "YOUTUBE",
    date: "AUG 14",
    isoDate: "2024-08-14",
    timestamp: "11:06",
    quote: "Your tutorials are helpful, but I still get confused during setup.",
    context: "Thoughtful feedback worth carrying into the next tutorial.",
  },
  openLoop: "Setup explanation could be clearer",
  nextAction: "Keep in context for the next tutorial",
  note: "A person with a pattern of useful feedback, not a score.",
} satisfies DemoAudienceMember;

export const jordan = {
  id: "jordan",
  name: "Jordan",
  descriptor: "Open conversation",
  sourceCount: "1 source moment",
  status: "open",
  facts: ["Asked about the creator toolkit", "1 open question"],
  primaryInteraction: {
    id: "jordan-livestream",
    platform: "LIVESTREAM",
    date: "AUG 19",
    isoDate: "2024-08-19",
    timestamp: "18:40",
    quote: "Will you share the toolkit you use for client projects?",
    context: "Promise to follow up is still open.",
  },
  openLoop: "Creator toolkit promise",
  nextAction: "Keep visible until answered",
  note: "A clear promise is easier to keep when it stays attached to its source.",
} satisfies DemoAudienceMember;

export const demoAudience = [alex, maya, jordan] as const;

export const alexThread = [
  {
    id: "thread-source",
    label: "AUG 03 / LIVESTREAM",
    title: "Alex asks a real question",
    detail: "What editing software should beginners use?",
    tone: "source",
  },
  {
    id: "thread-memory",
    label: "REMEMBERED",
    title: "Beginner editing",
    detail: "Unanswered question kept with its source.",
    tone: "remembered",
  },
  {
    id: "thread-content",
    label: "AUG 23 / NEW CONTENT",
    title: "My Beginner Editing Workflow",
    detail: "A new creator event makes the old memory relevant.",
    tone: "content",
  },
  {
    id: "thread-ready",
    label: "FOLLOW-UP READY",
    title: "This answers Alex's open question",
    detail: "Review the source and decide what happens next.",
    tone: "ready",
  },
] satisfies readonly MemoryThreadNode[];
