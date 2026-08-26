import "../load-env";

import { runMemoraContinuitySpike } from "../../lib/minds/memora-mind";

function printEvent(label: string, event: { summary: string; response: string | null; timedOut: boolean } | null): void {
  console.log(`\n${label}`);
  if (!event) {
    console.log("not reached");
    return;
  }
  console.log(`summary: ${event.summary}`);
  console.log(`timedOut: ${event.timedOut}`);
  console.log(`mindResponse: ${event.response ?? "[no response]"}`);
}

async function main(): Promise<void> {
  const runId = `memora-spike-${Date.now()}`;
  const result = await runMemoraContinuitySpike(runId);

  console.log("Memora Minds continuity spike");
  console.log(`runId: ${result.runId}`);
  console.log(`configReady: ${result.config.ready}`);
  console.log(`mindIdConfigured: ${result.config.configuredMindId ?? "[missing]"}`);
  console.log(`alias: ${result.config.alias}`);
  console.log(`connection: ${result.connection.status}`);
  console.log(`mind: ${result.mind?.name ?? "[unavailable]"}`);
  console.log(`mindEnabled: ${result.mind?.enabled ?? "[unknown]"}`);

  printEvent("EVENT 1", result.firstEvent);
  printEvent("EVENT 2", result.secondEvent);

  console.log("\nHISTORY PROOF");
  if (result.history) {
    console.log(`conversationId: ${result.history.conversationId ?? "[unavailable]"}`);
    console.log(`totalMessages: ${result.history.totalMessages}`);
    console.log(`humanMessages: ${result.history.humanMessages}`);
    console.log(`mindReplies: ${result.history.mindReplies}`);
    console.log(`firstEventRecorded: ${result.history.firstEventRecorded}`);
    console.log(`secondEventRecorded: ${result.history.secondEventRecorded}`);
    console.log(`sameConversation: ${result.history.sameConversation}`);
  } else {
    console.log("history: [unavailable]");
  }

  console.log("\nCONTINUITY VERDICT");
  console.log(`status: ${result.status}`);
  console.log(`reason: ${result.continuity.reason}`);
  console.log(`viewerReferenced: ${result.continuity.viewerReferenced}`);
  console.log(`contextTermsFound: ${result.continuity.contextTermsFound.join(", ") || "[none]"}`);
  console.log(`followUpReasonFound: ${result.continuity.followUpReasonFound}`);

  if (result.error) {
    console.error(
      `\nERROR [${result.error.code}]${result.error.status ? ` HTTP ${result.error.status}` : ""}: ${result.error.message}`,
    );
    if (result.error.requestId) console.error(`requestId: ${result.error.requestId}`);
  }

  if (result.status !== "verified") process.exitCode = 1;
}

void main();
