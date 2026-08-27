import Link from "next/link";

import { StateSticker } from "@/components/memora/state-sticker";
import { formatOnboardingMessageForDisplay } from "@/lib/discord/onboarding";
import { getJudgeOpportunityStatus } from "@/lib/data/judge-proof-builder";
import type { FollowUpContentTaskReceipt, JudgeAudienceRecord, JudgeProofData } from "@/lib/data/judge-proof-builder";
import type { FollowUpOpportunity } from "@/lib/data/follow-up-builder";

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function timestamp(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function statusTone(verified: boolean): "complete" | "open" {
  return verified ? "complete" : "open";
}

function onboardingModeLabel(mode: JudgeProofData["onboarding"]["sendMode"]): string {
  return mode === "draft_only"
    ? "DRAFT ONLY"
    : mode === "auto_send_welcome_only"
      ? "AUTO-SEND WELCOME ONLY"
      : "AUTO-SEND CLEAR GUIDE REQUESTS";
}

function onboardingStatusLabel(status: JudgeProofData["onboarding"]["latestStatus"]): string {
  return status ? status.toUpperCase() : "NO RECEIPT YET";
}

function StatusCard({ label, detail, verified }: { label: string; detail: string; verified: boolean }) {
  return (
    <article className="judge-proof__status-card">
      <div className="judge-proof__status-card-heading">
        <span className="data-label">{label}</span>
        <StateSticker tone={statusTone(verified)}>{verified ? "VERIFIED" : "WAITING"}</StateSticker>
      </div>
      <strong>{detail}</strong>
    </article>
  );
}

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="judge-proof__row">
      <span className="data-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AudienceRecord({ record }: { record: JudgeAudienceRecord }) {
  return (
    <article className="judge-proof__audience-card">
      <div className="judge-proof__audience-heading">
        <div>
          <span className="section-label">{record.name}</span>
          <span className="data-label">{record.platform.replace("_", " ").toUpperCase()}</span>
        </div>
        <StateSticker tone={record.imported ? "active" : "remembered"}>
          {record.imported ? "IMPORTED YOUTUBE" : "SEEDED DEMO FALLBACK"}
        </StateSticker>
      </div>
      <div className="judge-proof__audience-interactions">
        {record.interactions.map((interaction) => (
          <div key={interaction.id}>
            <p>“{interaction.text}”</p>
            <span className="data-label">{interaction.sourceTitle} / {shortDate(interaction.publishedAt)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function RepresentativeOpportunity({ opportunity }: { opportunity: FollowUpOpportunity }) {
  const status = getJudgeOpportunityStatus(opportunity);

  return (
    <article className="judge-proof__opportunity">
      <div className="judge-proof__opportunity-heading">
        <div>
          <span className="section-label">REPRESENTATIVE OPPORTUNITY</span>
          <h3>{opportunity.audienceMemberName} / {opportunity.creatorEventTitle}</h3>
        </div>
        <StateSticker tone={status === "posted" ? "complete" : status === "approved" ? "approved" : status === "dismissed" || status === "needs_follow_up_content" ? "remembered" : "open"}>
          {status === "posted" ? "POSTED TO YOUTUBE" : status === "approved" ? "APPROVED" : status === "dismissed" ? "DISMISSED" : status === "needs_follow_up_content" ? "MARKED AS CONTENT TO CREATE" : "NEEDS REVIEW"}
        </StateSticker>
      </div>
      <div className="judge-proof__opportunity-thread">
        <div>
          <span className="data-label">SOURCE COMMENT</span>
          <p>“{opportunity.proof.sourceComment}”</p>
        </div>
        <div>
          <span className="data-label">REMEMBERED CONTEXT</span>
          <p>{opportunity.proof.rememberedContext}</p>
        </div>
        <div>
          <span className="data-label">NEW CONTENT</span>
          <p>{opportunity.proof.newContent}</p>
        </div>
        <div>
          <span className="data-label">WHY NOW</span>
          <p>{opportunity.proof.followUpReason}</p>
        </div>
      </div>
      {opportunity.postedReply ? (
        <div className="judge-proof__posted-proof">
          <span className="state-sticker state-sticker--complete">POSTED TO YOUTUBE</span>
          <p>{opportunity.postedReply.replyText}</p>
          <span className="data-label">REPLY ID / {opportunity.postedReply.youtubeReplyId} / POSTED {shortDate(opportunity.postedReply.postedAt)}</span>
          </div>
      ) : status === "needs_follow_up_content" ? (
        <div className="judge-proof__content-receipt-next-step">
          <span className="data-label">CONTENT TASK SAVED / NOT SENT</span>
          <p>Next: create the beginner walkthrough, then import the published video.</p>
        </div>
      ) : (
        <div className="judge-proof__draft">
          <span className="data-label">SUGGESTED DRAFT / NOT SENT</span>
          <p>{opportunity.suggestedReply}</p>
        </div>
      )}
      <span className="judge-proof__proof-label">{opportunity.confidenceLabel}</span>
    </article>
  );
}

function FollowUpContentReceipt({ receipt }: { receipt: FollowUpContentTaskReceipt }) {
  return (
    <article className="judge-proof__content-receipt">
      <div className="judge-proof__opportunity-heading">
        <div>
          <span className="section-label">CONTENT TASK RECEIPT</span>
          <h3>{receipt.audienceMemberName} / {receipt.sourceTitle}</h3>
        </div>
        <StateSticker tone="remembered">NEEDS FOLLOW-UP CONTENT</StateSticker>
      </div>
      <div className="judge-proof__opportunity-thread">
        <div>
          <span className="data-label">FAN / SOURCE QUESTION</span>
          <p>{receipt.audienceMemberName}: “{receipt.sourceQuestion}”</p>
        </div>
        <div>
          <span className="data-label">STATUS</span>
          <p>{receipt.status}</p>
        </div>
        <div>
          <span className="data-label">SELECTED TONE</span>
          <p>{receipt.selectedTone ?? "Not recorded"}</p>
        </div>
        <div>
          <span className="data-label">MARKED</span>
          <p>{timestamp(receipt.createdAt)}</p>
        </div>
      </div>
      <div className="judge-proof__content-receipt-next-step">
        <span className="data-label">NEXT STEP</span>
        <p>{receipt.nextStep}. Return to Import after publishing it so Memora can reconnect it to this viewer.</p>
      </div>
    </article>
  );
}

function DiscordOpportunityProof({ opportunity }: { opportunity: FollowUpOpportunity }) {
  return (
    <article className="judge-proof__opportunity">
      <div className="judge-proof__opportunity-heading">
        <div>
          <span className="section-label">DISCORD OPPORTUNITY</span>
          <h3>{opportunity.audienceMemberName} / {opportunity.creatorEventTitle}</h3>
        </div>
        <StateSticker tone="remembered">READ-ONLY / DRAFT ONLY</StateSticker>
      </div>
      <div className="judge-proof__opportunity-thread">
        <div>
          <span className="data-label">SOURCE COMMENT</span>
          <p>“{opportunity.proof.sourceComment}”</p>
        </div>
        <div>
          <span className="data-label">NEW COMMUNITY CONTENT</span>
          <p>{opportunity.proof.newContent}</p>
        </div>
        <div>
          <span className="data-label">WHY NOW</span>
          <p>{opportunity.proof.followUpReason}</p>
        </div>
      </div>
      <div className="judge-proof__draft">
        <span className="data-label">SUGGESTED DRAFT / NOT SENT TO DISCORD</span>
        <p>{opportunity.suggestedReply}</p>
      </div>
    </article>
  );
}

export function JudgeProof({ proof, basePath }: { proof: JudgeProofData; basePath: string }) {
  return (
    <div className="judge-proof">
      <section className="judge-proof__hero" aria-labelledby="judge-proof-title">
        <div>
          <span className="section-label">JUDGE EVIDENCE / P8</span>
          <h2 id="judge-proof-title">Observe → Remember → Notice → Reconnect → Prove.</h2>
          <p>One evidence page for the full Memora loop: a real audience moment enters the workspace, stays attached to its source, meets a later creator moment, and becomes a creator-reviewed draft, content task, or confirmed reply.</p>
        </div>
        <div className="judge-proof__hero-note">
          <span className="state-sticker state-sticker--complete">RULE-BOUNDED ASSIST</span>
          <p>Discord onboarding follows configured rules; YouTube still requires creator approval and final confirmation.</p>
        </div>
      </section>

      <section className="judge-proof__section" aria-labelledby="judge-system-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">SYSTEM STATUS</span>
            <h2 id="judge-system-title">The loop has a receipt at every handoff.</h2>
          </div>
          <span className="data-label">LIVE WORKSPACE STATE</span>
        </div>
        <div className="judge-proof__status-grid">
          <StatusCard label="YOUTUBE OAUTH" detail="Connected channel" verified={proof.systemStatus.youtubeOAuthConnected} />
          <StatusCard label="SUPABASE" detail="Facts persisted" verified={proof.systemStatus.supabasePersistenceVerified} />
          <StatusCard label="MINDS" detail="Continuity verified" verified={proof.systemStatus.mindsContinuityVerified} />
          <StatusCard label="REVIEW ACTIONS" detail={proof.systemStatus.followUpActionsPersisted ? "Actions persisted" : "Ready to persist"} verified={proof.systemStatus.followUpActionsPersisted} />
        </div>
      </section>

      <section className="judge-proof__section judge-proof__section--blue" aria-labelledby="judge-ingestion-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">SOURCE INGESTION PROOF</span>
            <h2 id="judge-ingestion-title">The queue starts with source-backed moments.</h2>
          </div>
          <span className="state-sticker state-sticker--active">{proof.ingestion.dataOrigin === "real-youtube" ? "REAL YOUTUBE DATA" : proof.ingestion.dataOrigin === "real-discord" ? "REAL DISCORD DATA" : proof.ingestion.dataOrigin === "real-multi-source" ? "REAL MULTI-SOURCE DATA" : proof.ingestion.dataOrigin === "demo-seed-fallback" ? "DEMO FALLBACK" : "NO SOURCE DATA"}</span>
        </div>
        <div className="judge-proof__facts-grid">
          <ProofRow label="CONNECTED CHANNEL" value={proof.ingestion.channelTitle ?? "No channel connection"} />
          <ProofRow label="IMPORTED VIDEOS" value={`${proof.ingestion.importedVideoCount}`} />
          <ProofRow label="IMPORTED COMMENTS" value={`${proof.ingestion.importedCommentCount}`} />
          <ProofRow label="SOURCE-BACKED PEOPLE" value={`${proof.ingestion.sourceBackedAudienceCount}`} />
        </div>
        <div className="judge-proof__links">
           <Link className="secondary-link" href={`${basePath}/import`}>Open import desk <span className="secondary-link__arrow">↗</span></Link>
           <Link className="secondary-link" href={`${basePath}/memory`}>Open audience memory <span className="secondary-link__arrow">↗</span></Link>
        </div>
      </section>

      <section className="judge-proof__section judge-proof__section--discord" aria-labelledby="judge-discord-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">DISCORD COMMUNITY MEMORY</span>
            <h2 id="judge-discord-title">A read-only window into community continuity.</h2>
          </div>
          <span className="state-sticker state-sticker--remembered">{proof.discord.configured ? "READ-ONLY IMPORT" : "NOT CONFIGURED"}</span>
        </div>
        <p className="judge-proof__discord-copy">Discord import is read-only. Onboarding assist/send is separate and limited to configured rules and saved channels.</p>
        <div className="judge-proof__facts-grid">
          <ProofRow label="GUILD ID" value={proof.discord.guildId ?? "Not configured"} />
          <ProofRow label="MONITORED CHANNELS" value={`${proof.discord.monitoredChannelIds.length}`} />
          <ProofRow label="MESSAGES IMPORTED" value={`${proof.discord.importedMessageCount}`} />
          <ProofRow label="SOURCE-BACKED PEOPLE" value={`${proof.discord.sourceBackedPeopleCount}`} />
          <ProofRow label="DISCORD OPPORTUNITIES" value={`${proof.discord.opportunityCount}`} />
        </div>
        <div className="judge-proof__links">
           <Link className="secondary-link" href={`${basePath}/import/discord`}>Open Discord import <span className="secondary-link__arrow">↗</span></Link>
          <span className="data-label">CHANNELS / {proof.discord.monitoredChannelIds.join(", ") || "NONE"}</span>
        </div>
        {proof.discord.representative ? <DiscordOpportunityProof opportunity={proof.discord.representative} /> : null}
      </section>

      <section className="judge-proof__section judge-proof__section--onboarding" aria-labelledby="judge-onboarding-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">COMMUNITY ONBOARDING PROOF</span>
            <h2 id="judge-onboarding-title">Mind-guided help with a receipt.</h2>
          </div>
          <StateSticker tone={proof.onboarding.enabled ? "active" : "remembered"}>{proof.onboarding.enabled ? "ENABLED" : "OFF"}</StateSticker>
        </div>
        <p className="judge-proof__discord-copy">Memora only sends onboarding messages under configured rules. Import remains read-only; unclear or complex messages stay out of the auto-send path.</p>
        <div className="judge-proof__facts-grid">
          <ProofRow label="SEND MODE" value={onboardingModeLabel(proof.onboarding.sendMode)} />
          <ProofRow label="RECEIPTS" value={`${proof.onboarding.receiptsCount}`} />
          <ProofRow label="LATEST MEMBER" value={proof.onboarding.latestMember ?? "No member yet"} />
          <ProofRow label="LATEST STATUS" value={onboardingStatusLabel(proof.onboarding.latestStatus)} />
          <ProofRow label="TRIGGER" value={proof.onboarding.latestTriggerType?.replaceAll("_", " ").toUpperCase() ?? "NONE"} />
          <ProofRow label="SOURCE MESSAGE ID" value={proof.onboarding.latestSourceMessageId ?? "Not recorded"} />
          <ProofRow label="SENT MESSAGE ID" value={proof.onboarding.latestSentMessageId ?? "No Discord send proof"} />
          <ProofRow label="MIND CONVERSATION" value={proof.onboarding.latestMindConversationId ?? "Not recorded"} />
        </div>
        {proof.onboarding.latestSourceMessage ? (
          <div className="judge-proof__onboarding-message">
            <span className="data-label">SOURCE DISCORD MESSAGE</span>
            <p>“{proof.onboarding.latestSourceMessage}”</p>
          </div>
        ) : null}
        {proof.onboarding.latestMessage ? (
          <div className="judge-proof__onboarding-message">
            {proof.onboarding.liveListener ? <span className="state-sticker state-sticker--remembered">LIVE DISCORD LISTENER</span> : null}
            <span className="data-label">LATEST GENERATED MESSAGE</span>
            <p>{formatOnboardingMessageForDisplay(proof.onboarding.latestMessage)}</p>
            {proof.onboarding.latestSentMessageId ? <span className="data-label">SENT MESSAGE / {proof.onboarding.latestSentMessageId}</span> : <span className="data-label">NO DISCORD SEND PROOF</span>}
          </div>
        ) : null}
         <Link className="secondary-link" href={`${basePath}/import/discord`}>Open onboarding settings <span className="secondary-link__arrow">↗</span></Link>
      </section>

      <section className="judge-proof__section" aria-labelledby="judge-audience-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">AUDIENCE MEMORY PROOF</span>
            <h2 id="judge-audience-title">People stay attached to what they actually said.</h2>
          </div>
          <span className="data-label">{proof.audience.length} SAMPLE RECORDS</span>
        </div>
        {proof.audience.length > 0 ? (
          <div className="judge-proof__audience-grid">{proof.audience.map((record) => <AudienceRecord key={record.id} record={record} />)}</div>
        ) : (
          <div className="judge-proof__inline-empty">No imported or seeded audience records are available yet. Use the Import desk to create the first source-backed memory.</div>
        )}
      </section>

      <section className="judge-proof__section judge-proof__section--gold" aria-labelledby="judge-queue-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">FOLLOW-UP QUEUE PROOF</span>
            <h2 id="judge-queue-title">Notice the moment, then let the creator decide.</h2>
          </div>
           <Link className="secondary-link" href={`${basePath}/follow-up`}>Open opportunity queue <span className="secondary-link__arrow">↗</span></Link>
        </div>
        <div className="judge-proof__queue-stats">
          <ProofRow label="TOTAL OPPORTUNITIES" value={`${proof.queue.total}`} />
          <ProofRow label="NEEDS REVIEW" value={`${proof.queue.needsReview}`} />
           <ProofRow label="APPROVED" value={`${proof.queue.approved}`} />
           <ProofRow label="DISMISSED" value={`${proof.queue.dismissed}`} />
           <ProofRow label="NEEDS FOLLOW-UP CONTENT" value={`${proof.queue.needsFollowUpContent}`} />
           <ProofRow label="POSTED TO YOUTUBE" value={`${proof.queue.posted}`} />
          <ProofRow label="DISCORD OPPORTUNITIES" value={`${proof.queue.discordOpportunities}`} />
        </div>
         {proof.queue.representative ? (
           <RepresentativeOpportunity opportunity={proof.queue.representative} />
         ) : (
           <div className="judge-proof__inline-empty">No opportunity is available yet. The queue will only show a card when the source data supports a transparent question and creator-event connection.</div>
         )}
         {proof.queue.contentTaskReceipts.length > 0 ? (
           <div className="judge-proof__content-receipts" aria-labelledby="judge-content-task-title">
             <div className="judge-proof__section-heading">
               <div>
                 <span className="section-label">CONTENT TASK RECEIPTS</span>
                 <h3 id="judge-content-task-title">Future follow-ups stay attached to their source.</h3>
               </div>
               <span className="data-label">{proof.queue.contentTaskReceipts.length} SAVED</span>
             </div>
             {proof.queue.contentTaskReceipts.map((receipt) => <FollowUpContentReceipt key={receipt.id} receipt={receipt} />)}
           </div>
         ) : null}
        {proof.queue.posted === 0 ? (
          <div className="judge-proof__inline-empty">No YouTube replies posted yet.</div>
        ) : proof.queue.latestPostedReply ? (
          <div className="judge-proof__posted-proof">
            <span className="state-sticker state-sticker--complete">POSTED PROOF SAVED</span>
            <p>YouTube reply {proof.queue.latestPostedReply.youtubeReplyId} is recorded for the approved opportunity.</p>
            <span className="data-label">POSTED {shortDate(proof.queue.latestPostedReply.postedAt)} / OPPORTUNITY {proof.queue.latestPostedOpportunityId ?? "UNKNOWN"}</span>
            {proof.queue.latestPostedSourceTitle ? <span className="data-label">SOURCE / {proof.queue.latestPostedSourceTitle}</span> : null}
            {proof.queue.latestPostedSourceComment ? <p>SOURCE COMMENT: “{proof.queue.latestPostedSourceComment}”</p> : null}
          </div>
        ) : null}
      </section>

      <section className="judge-proof__section judge-proof__section--dark" aria-labelledby="judge-minds-title">
        <div className="judge-proof__section-heading">
          <div>
            <span className="section-label">MINDS CONTINUITY PROOF</span>
            <h2 id="judge-minds-title">The Mind proof is real, documented, and separate.</h2>
          </div>
          <StateSticker tone="complete">VERDICT VERIFIED</StateSticker>
        </div>
        <p className="judge-proof__minds-explanation">This page does not fake a live Minds call for each opportunity card. It surfaces the latest verified script proof as evidence that a persistent Mind can connect an earlier viewer question to a later creator event.</p>
        <div className="judge-proof__minds-grid">
          <ProofRow label="MEMORA MIND ID" value={proof.minds.mindId} />
          <ProofRow label="SPIKE RUN ID" value={proof.minds.runId} />
          <ProofRow label="CONVERSATION" value={proof.minds.conversationId} />
          <ProofRow label="PROOF SOURCE" value={proof.minds.label} />
        </div>
         <Link className="secondary-link" href={`${basePath}/proof/minds-spike`}>Open Minds proof surface <span className="secondary-link__arrow">↗</span></Link>
      </section>

      <section className="judge-proof__path" aria-labelledby="judge-path-title">
        <div>
          <span className="section-label">JUDGE DEMO PATH</span>
          <h2 id="judge-path-title">Five stops. One understandable loop.</h2>
        </div>
        <ol>
           <li><strong>01 / Observe</strong><span>Connect YouTube, fetch videos, and import comments.</span><Link href={`${basePath}/import`}>Open import</Link></li>
           <li><strong>02 / Remember</strong><span>Show source-backed people and their original comments.</span><Link href={`${basePath}/memory`}>Open memory</Link></li>
           <li><strong>03 / Notice</strong><span>Review the matched opportunity and its why-now proof.</span><Link href={`${basePath}/follow-up`}>Open queue</Link></li>
           <li><strong>04 / Reconnect</strong><span>Approve, confirm, or save the next video as a content task. Nothing posts without explicit confirmation.</span><Link href={`${basePath}/follow-up`}>Review follow-up</Link></li>
           <li><strong>05 / Prove</strong><span>Show the persistent Minds continuity evidence.</span><Link href={`${basePath}/proof/minds-spike`}>Open proof</Link></li>
        </ol>
      </section>
    </div>
  );
}
