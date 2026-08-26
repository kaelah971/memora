"use client";

import { useActionState } from "react";

import { ProofPanel } from "@/components/memora/proof-panel";
import { StateSticker } from "@/components/memora/state-sticker";
import { runMindsSpikeAction } from "@/app/app/proof/minds-spike/actions";
import type { MindsConfigStatus, MindsSpikeResult } from "@/lib/minds/types";

interface MindsSpikeProofProps {
  configStatus: MindsConfigStatus;
}

function ValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="minds-proof__value-row">
      <span className="data-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EventResult({
  label,
  event,
}: {
  label: string;
  event: MindsSpikeResult["firstEvent"];
}) {
  return (
    <section className="minds-proof__event" aria-labelledby={`${label}-title`}>
      <div className="minds-proof__event-heading">
        <span className="section-label">{label}</span>
        <StateSticker tone={event?.responseReceived ? "complete" : "open"}>
          {event?.responseReceived ? "REAL REPLY" : "NO REPLY"}
        </StateSticker>
      </div>
      <h3 id={`${label}-title`}>{event?.summary ?? "The event was not reached."}</h3>
      <div className="minds-proof__response">
        <span className="data-label">MIND RESPONSE</span>
        <p>{event?.response ?? "No response was returned."}</p>
      </div>
    </section>
  );
}

export function MindsSpikeProof({ configStatus }: MindsSpikeProofProps) {
  const [result, formAction, isPending] = useActionState<MindsSpikeResult | null, FormData>(
    runMindsSpikeAction,
    null,
  );
  const verdictTone = result?.status === "verified" ? "complete" : "open";

  return (
    <div className="minds-proof">
      <div className="minds-proof__notice">
        <span className="section-label">INTERNAL INTEGRATION PROOF / DEVELOPMENT ONLY</span>
        <p>
          This screen makes a real Builder API request. It has no local AI fallback and does not
          persist results outside the Mind conversation history.
        </p>
      </div>

      <div className="minds-proof__config">
        <div>
          <span className="section-label">CONFIGURATION</span>
          <h2>One configured Mind. One stable conversation alias.</h2>
        </div>
        <div className="minds-proof__values">
          <ValueRow label="BUILDER KEY" value={configStatus.apiKeyConfigured ? "CONFIGURED / SERVER ONLY" : "MISSING"} />
          <ValueRow label="MIND ID" value={configStatus.configuredMindId ?? "MISSING"} />
          <ValueRow label="ALIAS" value={configStatus.alias} />
          <ValueRow label="RUNTIME" value={configStatus.ready ? "READY TO CALL MINDS" : `MISSING ${configStatus.missing.join(", ")}`} />
        </div>
      </div>

      <form action={formAction} className="minds-proof__form">
        <button className="primary-button minds-proof__run" disabled={isPending} type="submit">
          {isPending ? "RUNNING REAL SPIKE..." : "RUN REAL MINDS SPIKE"}
        </button>
         <span className="data-label">180 SECOND REPLY WINDOW / HISTORY FALLBACK ENABLED</span>
      </form>

      {result ? (
        <div className="minds-proof__result" aria-live="polite">
          <ProofPanel
            eyebrow="CONNECTION"
            title={result.connection.status === "connected" ? "Builder API connection established." : "Builder API connection failed."}
            titleId="minds-connection-title"
          >
            <div className="minds-proof__connection-grid">
              <ValueRow label="MIND" value={result.mind?.name ?? "Unavailable"} />
              <ValueRow label="MIND ID" value={result.connection.mindId ?? "Unavailable"} />
              <ValueRow label="ALIAS" value={result.connection.alias} />
              <ValueRow label="CONVERSATION" value={result.connection.conversationId ?? "Unavailable"} />
              <ValueRow label="RUN ID" value={result.runId} />
            </div>
          </ProofPanel>

          <div className="minds-proof__events">
            <EventResult label="EVENT 1 / AUDIENCE MEMORY" event={result.firstEvent} />
            <EventResult label="EVENT 2 / CREATOR EVENT" event={result.secondEvent} />
          </div>

          <section className="minds-proof__history" aria-labelledby="minds-history-title">
            <div className="minds-proof__event-heading">
              <div>
                <span className="section-label">HISTORY PROOF</span>
                <h2 id="minds-history-title">Both interactions are checked against one alias.</h2>
              </div>
              <StateSticker tone={result.history?.sameConversation ? "complete" : "open"}>
                {result.history?.sameConversation ? "SAME CONVERSATION" : "NOT PROVEN"}
              </StateSticker>
            </div>
            <div className="minds-proof__history-grid">
              <ValueRow label="TOTAL MESSAGES" value={`${result.history?.totalMessages ?? 0}`} />
              <ValueRow label="MIND REPLIES" value={`${result.history?.mindReplies ?? 0}`} />
              <ValueRow label="EVENT 1 RECORDED" value={result.history?.firstEventRecorded ? "YES" : "NO"} />
              <ValueRow label="EVENT 2 RECORDED" value={result.history?.secondEventRecorded ? "YES" : "NO"} />
            </div>
          </section>

          <section className="minds-proof__verdict" aria-labelledby="minds-verdict-title">
            <div>
              <span className="section-label">CONTINUITY VERDICT</span>
              <h2 id="minds-verdict-title">
                {result.status === "verified" ? "The second event used earlier context." : "Continuity is not verified."}
              </h2>
              <p>{result.continuity.reason}</p>
            </div>
            <StateSticker tone={verdictTone}>
              {result.status === "verified" ? "LIVE CONTINUITY VERIFIED" : "NOT VERIFIED"}
            </StateSticker>
          </section>

          {result.error ? (
            <div className="minds-proof__error" role="alert">
              <span className="section-label">DIAGNOSTIC</span>
              <p>
                [{result.error.code}] {result.error.message}
                {result.error.requestId ? ` Request ID: ${result.error.requestId}` : ""}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="minds-proof__empty">
          <span className="section-label">NO LIVE RESULT YET</span>
          <p>Run the spike to show the real Mind responses and history evidence here.</p>
        </div>
      )}
    </div>
  );
}
