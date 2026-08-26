export type SourceType = "LIVESTREAM" | "YOUTUBE";

export type MemoryStatus =
  | "remembered"
  | "open"
  | "ready"
  | "approved"
  | "complete";

export type ThreadTone =
  | "source"
  | "remembered"
  | "content"
  | "open"
  | "ready"
  | "complete";

export interface DemoInteraction {
  id: string;
  platform: SourceType;
  date: string;
  isoDate: string;
  timestamp: string;
  quote: string;
  context: string;
}

export interface DemoAudienceMember {
  id: string;
  name: string;
  descriptor: string;
  sourceCount: string;
  status: MemoryStatus;
  facts: readonly string[];
  primaryInteraction: DemoInteraction;
  secondaryInteraction?: DemoInteraction;
  openLoop?: string;
  nextAction?: string;
  note?: string;
}

export interface MemoryThreadNode {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: ThreadTone;
}
