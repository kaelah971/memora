"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  markFollowUpNeedsContent,
  reviewFollowUpOpportunity,
  type FollowUpReviewAction,
} from "@/app/app/follow-up/actions";
import { StateSticker } from "@/components/memora/state-sticker";
import {
  FOLLOW_UP_REPLY_VARIANTS,
  followUpOpportunityAnchor,
  getFollowUpActionVisibility,
  getFollowUpReplyVariants,
  type FollowUpReplyVariant,
} from "@/lib/data/follow-up-builder";
import type {
  FollowUpOpportunity,
  FollowUpStatus,
  FollowUpMindReasoning,
  PostedReplyProof,
} from "@/lib/data/follow-up-builder";

interface FollowUpQueueProps {
  opportunities: FollowUpOpportunity[];
  postingEnabled: boolean;
  basePath: string;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function statusLabel(status: FollowUpStatus): string {
  return status === "approved"
    ? "APPROVED"
    : status === "dismissed"
      ? "DISMISSED"
        : status === "posted"
        ? "POSTED TO YOUTUBE"
        : status === "needs_follow_up_content"
          ? "MARKED AS CONTENT TO CREATE"
          : "NEEDS REVIEW";
}

function statusTone(status: FollowUpStatus): "approved" | "remembered" | "open" | "complete" {
  return status === "approved" ? "approved" : status === "dismissed" || status === "needs_follow_up_content" ? "remembered" : status === "posted" ? "complete" : "open";
}

function dataOriginLabel(origin: FollowUpOpportunity["dataOrigin"]): string {
  return origin === "real-youtube"
    ? "REAL YOUTUBE DATA"
    : origin === "real-discord"
      ? "REAL DISCORD DATA"
      : origin === "real-multi-source"
        ? "REAL MULTI-SOURCE DATA"
        : "DEMO FALLBACK";
}

function proofRow(label: string, value: string) {
  return (
    <div className="follow-up-card__proof-item" key={label}>
      <span className="data-label">{label}</span>
      <p>{value}</p>
    </div>
  );
}

function FollowUpCard({ opportunity, postingEnabled, basePath }: { opportunity: FollowUpOpportunity; postingEnabled: boolean; basePath: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<FollowUpStatus>(opportunity.status);
  const [postedReply, setPostedReply] = useState<PostedReplyProof | null>(opportunity.postedReply);
  const [isPending, startTransition] = useTransition();
  const [isPostPending, startPostTransition] = useTransition();
  const [isContentPending, startContentTransition] = useTransition();
  const [isMindPending, startMindTransition] = useTransition();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [confirmPost, setConfirmPost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [mindReasoning, setMindReasoning] = useState<FollowUpMindReasoning | null>(opportunity.mindReasoning);
  const [mindError, setMindError] = useState<string | null>(null);
  const replyVariants = getFollowUpReplyVariants({ ...opportunity, mindReasoning });
  const [selectedReplyVariant, setSelectedReplyVariant] = useState<FollowUpReplyVariant>(opportunity.selectedReplyVariant ?? "warm");
  const selectedReply = opportunity.selectedReplyVariant === null && selectedReplyVariant === "warm" && opportunity.selectedReply
    ? opportunity.selectedReply
    : replyVariants[selectedReplyVariant];
  const canPost = postingEnabled && opportunity.sourcePlatform === "youtube" && Boolean(opportunity.sourceVideoId);
  const actionVisibility = getFollowUpActionVisibility(status, Boolean(postedReply));
  const mindAdvisory = mindReasoning?.variants.advisory;

  function chooseReplyVariant(variant: FollowUpReplyVariant): void {
    setSelectedReplyVariant(variant);
    setCopyState("idle");
    setConfirmPost(false);
    if (status === "approved" && variant !== opportunity.selectedReplyVariant) {
      setStatus("needs_review");
    }
  }

  function review(action: FollowUpReviewAction): void {
    setError(null);
    startTransition(async () => {
      const result = await reviewFollowUpOpportunity({
        action,
        opportunityId: opportunity.id,
        interactionId: opportunity.interactionId,
         creatorEventId: opportunity.creatorEventId,
         audienceMemberId: opportunity.audienceMemberId,
         draft: selectedReply,
         replyVariant: selectedReplyVariant,
      });
      if (!result.ok || !result.status) {
        setError(result.error ?? "The review action could not be saved.");
        return;
      }
      setStatus(result.status);
      router.refresh();
    });
  }

  function markContentToCreate(): void {
    setError(null);
    startContentTransition(async () => {
      const result = await markFollowUpNeedsContent({
        opportunityId: opportunity.id,
        interactionId: opportunity.interactionId,
        creatorEventId: opportunity.creatorEventId,
        audienceMemberId: opportunity.audienceMemberId,
        replyVariant: selectedReplyVariant,
      });
      if (!result.ok || !result.status) {
        setError(result.error ?? "The content planning status could not be saved.");
        return;
      }
      setStatus(result.status);
      router.refresh();
    });
  }

  async function copyDraft(): Promise<void> {
    try {
      await navigator.clipboard.writeText(selectedReply);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  function askMind(): void {
    setMindError(null);
    startMindTransition(async () => {
      try {
        const response = await fetch("/api/minds/reason-follow-up", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ opportunityId: opportunity.id, interactionId: opportunity.interactionId }),
        });
        const result = (await response.json()) as { reasoning?: FollowUpMindReasoning; error?: string };
        if (!response.ok || !result.reasoning) {
          setMindError(result.error ?? "Memora Mind could not explain this opportunity.");
          return;
        }
        setMindReasoning(result.reasoning);
      } catch {
        setMindError("Memora Mind could not be reached. The deterministic opportunity is still available.");
      }
    });
  }

  function postReply(): void {
    setPostError(null);
    startPostTransition(async () => {
      try {
        const response = await fetch("/api/youtube/post-reply", {
          method: "POST",
          headers: { "content-type": "application/json" },
           body: JSON.stringify({ opportunityId: opportunity.id, replyText: selectedReply }),
        });
        const result = (await response.json()) as { posted?: boolean; proof?: PostedReplyProof; error?: string };
        if (!response.ok || !result.posted || !result.proof) {
          setPostError(result.error ?? "The YouTube reply was not posted.");
          return;
        }
        setPostedReply(result.proof);
        setStatus("posted");
        setConfirmPost(false);
        router.refresh();
      } catch {
        setPostError("The YouTube reply request could not be completed.");
      }
    });
  }

  return (
    <article id={followUpOpportunityAnchor(opportunity.id)} className="follow-up-card" aria-labelledby={`${opportunity.id}-title`}>
      <header className="follow-up-card__header">
        <div>
          <div className="follow-up-card__meta">
            <span className="state-sticker state-sticker--active">{dataOriginLabel(opportunity.dataOrigin)}</span>
            <span className="data-label">{formatDate(opportunity.creatorEventOccurredAt)}</span>
          </div>
          <h3 id={`${opportunity.id}-title`}>{opportunity.audienceMemberName} is worth carrying forward.</h3>
          <p className="follow-up-card__headline">{opportunity.whyNow}</p>
        </div>
        <StateSticker tone={statusTone(status)}>{statusLabel(status)}</StateSticker>
      </header>

      <div className="follow-up-card__thread" aria-label="Opportunity context">
        <section className="follow-up-card__moment">
          <span className="section-label">AUDIENCE MEMORY</span>
          <p className="follow-up-card__quote">“{opportunity.commentText}”</p>
          <span className="data-label">{opportunity.sourceTitle} / {formatDate(opportunity.commentPublishedAt)}</span>
        </section>
        <span className="follow-up-card__thread-line" aria-hidden="true" />
        <section className="follow-up-card__moment follow-up-card__moment--event">
          <span className="section-label">NEW CREATOR EVENT</span>
          <h4>{opportunity.creatorEventTitle}</h4>
          <p>{opportunity.creatorEventDescription ?? "New creator content was recorded in the workspace."}</p>
          <span className="data-label">{formatDate(opportunity.creatorEventOccurredAt)}</span>
        </section>
      </div>

      {opportunity.onboardingContext ? (
        <section className="follow-up-card__onboarding-context" aria-label="Onboarding memory">
          <span className="section-label">ONBOARDING MEMORY</span>
          <p>{opportunity.onboardingContext}</p>
        </section>
      ) : null}

      {mindReasoning ? (
        <section className="follow-up-card__mind-reasoning" aria-labelledby={`${opportunity.id}-mind-reasoning-title`}>
          <div className="follow-up-card__mind-heading">
            <div>
              <span className="section-label">MEMORA MIND / ADVISORY</span>
              <h4 id={`${opportunity.id}-mind-reasoning-title`}>Live reasoning for this follow-up</h4>
            </div>
            <span className="state-sticker state-sticker--complete">SOURCE-GROUNDED</span>
          </div>
           <p className="follow-up-card__mind-source">Generated by Memora Mind from source-backed facts.</p>
           {mindAdvisory ? (
             <div className="follow-up-card__mind-advisory" aria-label="Creator advisory">
               <div className="follow-up-card__mind-advisory-item">
                 <span className="data-label">FAN QUESTION</span>
                 <p>{mindAdvisory.fanQuestion ?? opportunity.commentText}</p>
               </div>
               <div className="follow-up-card__mind-advisory-item">
                 <span className="data-label">SOURCE VIDEO CONTEXT</span>
                 <p>{mindAdvisory.sourceContext ?? `${opportunity.sourceTitle}${opportunity.sourceDescription ? `: ${opportunity.sourceDescription}` : ""}`}</p>
               </div>
               <div className="follow-up-card__mind-advisory-item">
                 <span className="data-label">LIKELY NEED</span>
                 <p>{mindAdvisory.likelyNeed ?? "No additional need was inferred beyond the source-backed question."}</p>
               </div>
               <div className="follow-up-card__mind-advisory-item">
                 <span className="data-label">RECOMMENDED ACTION</span>
                 <p>{opportunity.creatorEventVideoUrl ? "Reply with the follow-up video." : "Create the beginner walkthrough first."}</p>
               </div>
               <div className="follow-up-card__mind-advisory-item follow-up-card__mind-advisory-item--wide">
                 <span className="data-label">REPLY NOW DRAFT</span>
                 <p>{mindAdvisory.replyNow ?? opportunity.suggestedReply}</p>
                 <span className="data-label">ADVISORY ONLY / NOT POSTED</span>
               </div>
               <div className="follow-up-card__mind-advisory-item follow-up-card__mind-advisory-item--wide">
                 <span className="data-label">FOLLOW-UP OUTLINE</span>
                 <p>{mindAdvisory.followUpOutline ?? "No follow-up content outline was returned."}</p>
               </div>
               <div className="follow-up-card__mind-advisory-item follow-up-card__mind-advisory-item--wide">
                 <span className="data-label">ATTACHED VIDEO STATUS</span>
                 <p>{opportunity.creatorEventVideoUrl ? "Follow-up video attached" : "No follow-up video attached yet."}</p>
                 {opportunity.creatorEventVideoUrl ? (
                   <a
                     className="follow-up-card__mind-advisory-link"
                     href={opportunity.creatorEventVideoUrl}
                     target="_blank"
                     rel="noreferrer"
                   >
                     Open matching YouTube video
                   </a>
                 ) : (
                   <span className="data-label">NO VERIFIED VIDEO LINK</span>
                 )}
               </div>
             </div>
           ) : (
             <p className="follow-up-card__mind-text">{mindReasoning.reasoningText}</p>
           )}
           <div className="follow-up-card__mind-tone">
            <span className="data-label">SUGGESTED TONE</span>
            <strong>{mindReasoning.tone}</strong>
          </div>
          <span className="data-label">CONVERSATION / {mindReasoning.conversationId} / UPDATED {formatDate(mindReasoning.updatedAt)}</span>
        </section>
      ) : null}

      {status === "needs_follow_up_content" ? (
        <section className="follow-up-card__content-next-step" aria-labelledby={`${opportunity.id}-content-next-step-title`}>
          <div className="follow-up-card__content-next-step-heading">
            <div>
              <span className="section-label">SAVED FOLLOW-UP TASK</span>
              <h4 id={`${opportunity.id}-content-next-step-title`}>Marked as content to create.</h4>
            </div>
            <StateSticker tone="remembered">SAVED STATE</StateSticker>
          </div>
          <p>Memora is keeping this fan attached to the future follow-up.</p>
          <div className="follow-up-card__content-next-step-copy">
            <strong>Next: create the beginner walkthrough.</strong>
            <p>After you publish it, come back to Import, fetch your latest videos, and import the new video.</p>
            <p>Memora will then reconnect this video to the original fan question.</p>
          </div>
          <div className="follow-up-card__content-next-step-actions">
            <Link className="primary-button" href={`${basePath}/import`}>GO TO IMPORT</Link>
            <Link className="secondary-button" href={`${basePath}/proof`}>VIEW PROOF</Link>
          </div>
        </section>
      ) : null}

      {postedReply ? (
        <section className="follow-up-card__posted" aria-labelledby={`${opportunity.id}-posted-title`}>
          <div className="follow-up-card__draft-heading">
            <div>
              <span className="section-label">POSTING PROOF</span>
              <h4 id={`${opportunity.id}-posted-title`}>Posted to YouTube successfully.</h4>
            </div>
            <StateSticker tone="complete">POSTED TO YOUTUBE</StateSticker>
          </div>
          <p className="follow-up-card__draft-copy">{postedReply.replyText}</p>
          <div className="follow-up-card__posted-meta">
            <span className="data-label">YOUTUBE REPLY ID / {postedReply.youtubeReplyId}</span>
            <span className="data-label">POSTED / {formatDate(postedReply.postedAt)}</span>
          </div>
        </section>
      ) : (
        <section className="follow-up-card__draft" aria-labelledby={`${opportunity.id}-draft-title`}>
          <div className="follow-up-card__draft-heading">
             <div>
               <span className="section-label">{status === "needs_follow_up_content" ? "FUTURE FOLLOW-UP REPLY" : "SUGGESTED FOLLOW-UP"}</span>
               <h4 id={`${opportunity.id}-draft-title`}>{status === "needs_follow_up_content" ? "Keep this reply for when the video is ready." : "A draft for creator review"}</h4>
             </div>
             <span className="data-label">{status === "needs_follow_up_content" ? "CONTENT TASK SAVED / NOT SENT" : "DRAFT ONLY / NOT SENT"}</span>
          </div>
            <fieldset className="follow-up-card__reply-variants">
              <legend className="section-label">CHOOSE A REPLY VARIANT</legend>
              {(Object.keys(FOLLOW_UP_REPLY_VARIANTS) as FollowUpReplyVariant[]).map((variant) => (
                <div className={`follow-up-card__reply-variant${selectedReplyVariant === variant ? " follow-up-card__reply-variant--selected" : ""}`} key={variant}>
                  <label>
                    <input
                      type="radio"
                      name={`${opportunity.id}-reply-variant`}
                      value={variant}
                      checked={selectedReplyVariant === variant}
                      onChange={() => chooseReplyVariant(variant)}
                    />
                    <span>
                      <strong>{FOLLOW_UP_REPLY_VARIANTS[variant]}</strong>
                      <span>{replyVariants[variant]}</span>
                    </span>
                  </label>
                  <button className="secondary-button" type="button" onClick={() => chooseReplyVariant(variant)}>
                    USE THIS REPLY
                  </button>
                </div>
              ))}
            </fieldset>
            <div className="follow-up-card__selected-reply" aria-live="polite">
              <span className="data-label">SELECTED REPLY / {FOLLOW_UP_REPLY_VARIANTS[selectedReplyVariant]}</span>
              <p className="follow-up-card__draft-copy">{selectedReply}</p>
            </div>
           <div className="follow-up-card__draft-video-status">
             <span className="data-label">FOLLOW-UP VIDEO STATUS</span>
             {opportunity.creatorEventVideoUrl ? (
               <a
                 href={opportunity.creatorEventVideoUrl}
                 target="_blank"
                 rel="noreferrer"
               >
                 Follow-up video attached
               </a>
             ) : (
               <span>No follow-up video attached yet.</span>
             )}
           </div>
           <div className="follow-up-card__draft-footer">
            <span className="follow-up-card__confidence">{opportunity.confidenceLabel}</span>
            <button className="secondary-button" type="button" onClick={copyDraft}>
               {copyState === "copied" ? "COPIED REPLY" : copyState === "failed" ? "COPY UNAVAILABLE" : "COPY SELECTED REPLY"}
            </button>
          </div>
        </section>
      )}

       {confirmPost && actionVisibility.showPost && canPost ? (
        <section className="follow-up-card__post-confirmation" aria-labelledby={`${opportunity.id}-post-confirm-title`}>
          <span className="section-label">FINAL CONFIRMATION</span>
          <h4 id={`${opportunity.id}-post-confirm-title`}>This will publicly reply on YouTube.</h4>
          <p>Memora will not post again unless you approve another reply.</p>
           <blockquote>{selectedReply}</blockquote>
          {postError ? <p className="follow-up-card__error" role="alert">{postError}</p> : null}
          <div className="follow-up-card__action-buttons">
            <button className="secondary-button" type="button" disabled={isPostPending} onClick={() => setConfirmPost(false)}>CANCEL</button>
            <button className="primary-button" type="button" disabled={isPostPending} onClick={postReply}>{isPostPending ? "POSTING..." : "CONFIRM AND POST REPLY"}</button>
          </div>
        </section>
      ) : null}

      <section className="follow-up-card__proof" aria-labelledby={`${opportunity.id}-proof-title`}>
        <div className="follow-up-card__proof-heading">
          <div>
            <span className="section-label">PROOF THREAD</span>
            <h4 id={`${opportunity.id}-proof-title`}>Why Memora thinks this is timely</h4>
          </div>
          <span className="data-label">TRANSPARENT MATCH</span>
        </div>
        <div className="follow-up-card__proof-grid">
          {proofRow("SOURCE COMMENT", opportunity.proof.sourceComment)}
          {proofRow("REMEMBERED CONTEXT", opportunity.proof.rememberedContext)}
          {proofRow("NEW CONTENT / EVENT", opportunity.proof.newContent)}
          {proofRow("FOLLOW-UP REASON", opportunity.proof.followUpReason)}
        </div>
        <div className="follow-up-card__minds-proof">
          <span className="state-sticker state-sticker--complete">MINDS PROOF AVAILABLE</span>
          <div>
            <strong>{opportunity.proof.mindsContinuity.label}</strong>
            <p>{opportunity.proof.mindsContinuity.detail}</p>
            <span className="data-label">RUN {opportunity.proof.mindsContinuity.runId} / CONVERSATION {opportunity.proof.mindsContinuity.conversationId}</span>
          </div>
        </div>
      </section>

      <footer className="follow-up-card__actions">
        <div>
          <span className="data-label">
            {actionVisibility.showPostedProof
              ? "PROOF SAVED AFTER API SUCCESS"
                 : status === "approved"
                 ? "CREATOR APPROVAL SAVED"
                 : status === "needs_follow_up_content"
                   ? "FOLLOW-UP CONTENT TO CREATE"
                : status === "dismissed"
                  ? "NO POSTING APPROVED"
                  : "CREATOR APPROVAL REQUIRED"}
          </span>
          {error ? <p className="follow-up-card__error" role="alert">{error}</p> : null}
          {postError && !confirmPost ? <p className="follow-up-card__error" role="alert">{postError}</p> : null}
          {mindError ? <p className="follow-up-card__error" role="alert">{mindError}</p> : null}
             <p className="follow-up-card__mind-status" role="status" aria-live="polite">{isMindPending ? "Asking Memora Mind…" : ""}</p>
        </div>
         <div className="follow-up-card__action-buttons">
          <div className="follow-up-card__mind-action">
             <p id={`${opportunity.id}-mind-helper`} className="follow-up-card__mind-helper">Ask the persistent Mind what this fan needs, whether to reply now, and what follow-up content to make. Nothing is posted automatically.</p>
            <button className="secondary-button" type="button" aria-describedby={`${opportunity.id}-mind-helper`} disabled={isMindPending || isPostPending} onClick={askMind}>
              {isMindPending ? "ASKING MEMORA MIND…" : mindReasoning ? "REFRESH MIND REASONING" : "ASK MEMORA MIND"}
            </button>
          </div>
           {!actionVisibility.showPostedProof ? (
             <>
             {actionVisibility.showPost && canPost ? (
               <button className="secondary-button" type="button" disabled={isPostPending || isContentPending} onClick={() => { setPostError(null); setConfirmPost(true); }}>
                 APPROVE &amp; SEND TO YOUTUBE
               </button>
             ) : null}
             {status === "needs_review" && !opportunity.creatorEventVideoUrl ? (
               <button className="secondary-button" type="button" disabled={isPending || isContentPending || isPostPending} onClick={markContentToCreate}>
                 {isContentPending ? "SAVING..." : "MARK AS NEEDS FOLLOW-UP CONTENT"}
               </button>
             ) : null}
             {actionVisibility.showDismiss ? (
               <button className="secondary-button" type="button" disabled={isPending || isContentPending || isPostPending} onClick={() => review("dismiss")}>
                 {isPending ? "SAVING..." : "DISMISS"}
               </button>
             ) : null}
             {actionVisibility.showApprove ? (
               <button className="primary-button" type="button" disabled={isPending || isContentPending || isPostPending} onClick={() => review("approve")}>
                 {isPending ? "SAVING..." : "APPROVE SELECTED REPLY"}
               </button>
             ) : null}
            </>
          ) : null}
        </div>
      </footer>
    </article>
  );
}

export function FollowUpQueue({ opportunities, postingEnabled, basePath }: FollowUpQueueProps) {
  return (
    <div className="follow-up-queue__list">
      {opportunities.map((opportunity) => <FollowUpCard key={opportunity.id} opportunity={opportunity} postingEnabled={postingEnabled} basePath={basePath} />)}
    </div>
  );
}
