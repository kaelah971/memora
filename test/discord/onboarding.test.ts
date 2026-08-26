import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDiscordOnboardingPrompt,
  canAutoSendOnboarding,
  cleanAndValidateOnboardingMessage,
  formatOnboardingMessageForDisplay,
  isClearGuideRequest,
  matchClearGuideRequest,
} from "../../lib/discord/onboarding";

const channels = [
  { id: "1541890626864554110", name: "creator-questions", label: "question channel" },
  { id: "1541890494035136522", name: "announcements", label: "resource channel" },
];

test("guide request detection matches explicit beginner-guide phrases and stays narrow", () => {
  const guideRequests = [
    "where is the creator starter guide?",
    "where is the starter guide?",
    "where can I find the starter guide?",
    "can you send me the starter guide for creators?",
    "can you show me the beginner guide?",
    "can someone show me the beginner guide?",
    "please where should I start as a beginner creator?",
    "I’m new here",
    "I'm new here, where do I start?",
    "where do I start?",
    "where should I start?",
    "how do I start?",
    "what should I read first?",
    "any beginner resources?",
    "beginner resources please",
    "starter resources please",
  ];
  for (const message of guideRequests) assert.equal(isClearGuideRequest(message), true, message);

  assert.equal(isClearGuideRequest("Any resources for beginners?"), true);
  const unrelatedMessages = [
    "I like this project",
    "creators need better tools",
    "this video is interesting",
    "I have a wallet setup question",
    "when is the next event?",
    "The new video is helpful, thanks!",
    "Can someone review my complex workflow?",
    "What should I read next about this bug report?",
  ];
  for (const message of unrelatedMessages) assert.equal(isClearGuideRequest(message), false, message);
  assert.deepEqual(matchClearGuideRequest("where is the creator starter guide?"), { matched: true, reason: "starter_guide_location" });
});

test("onboarding prompt includes source-backed settings, voice, trigger, source text, and prior memory", () => {
  const prompt = buildDiscordOnboardingPrompt({
    communityName: "Memora Community",
    creatorVoice: "beginner-friendly",
    channels,
    beginnerGuideText: "Start in #announcements, then ask questions in #creator-questions.",
    userHandle: "Kaelah",
    triggerType: "guide_request",
    priorMemory: "No prior onboarding receipt is recorded.",
    sourceMessageText: "I'm new here, where do I start?",
  });
  assert.match(prompt, /Memora Community/);
  assert.match(prompt, /beginner-friendly/);
  assert.match(prompt, /resource channel: #announcements/);
  assert.match(prompt, /Start in #announcements/);
  assert.match(prompt, /Kaelah/);
  assert.match(prompt, /guide_request/);
  assert.match(prompt, /No prior onboarding receipt/);
  assert.match(prompt, /Do not invent channels, links, or resources/);
  assert.match(prompt, /drafted for creator review instead of auto-sent/);
});

test("send modes only permit explicit welcome or clear-guide triggers", () => {
  assert.equal(canAutoSendOnboarding("draft_only", "member_join"), false);
  assert.equal(canAutoSendOnboarding("auto_send_welcome_only", "member_join"), true);
  assert.equal(canAutoSendOnboarding("auto_send_welcome_only", "guide_request"), false);
  assert.equal(canAutoSendOnboarding("auto_send_clear_guide_requests", "guide_request"), true);
  assert.equal(canAutoSendOnboarding("auto_send_clear_guide_requests", "first_message"), false);
});

test("Mind onboarding output cannot introduce unconfigured links or channels", () => {
  const guide = "Start in #announcements, then ask questions in #creator-questions. See https://memora.test/start";
  assert.equal(
    cleanAndValidateOnboardingMessage("Start in #announcements. See https://memora.test/start", channels, guide),
    "Start in #announcements. See https://memora.test/start",
  );
  assert.throws(
    () => cleanAndValidateOnboardingMessage("Join #secret-room for help.", channels, guide),
    /not configured/,
  );
  assert.throws(
    () => cleanAndValidateOnboardingMessage("Read https://example.com/guide", channels, guide),
    /not in the configured beginner guide/,
  );
});

test("onboarding messages become readable plain text when Mind returns HTML", () => {
  const response = "<p><b>Welcome!</b></p><p>Start here:</p><ul><li>Read #announcements.</li><li>Ask in #creator-questions.</li></ul>";
  const expected = "Welcome!\n\nStart here:\n\n- Read #announcements.\n- Ask in #creator-questions.";

  assert.equal(formatOnboardingMessageForDisplay(response), expected);
  assert.equal(cleanAndValidateOnboardingMessage(response, channels, "Start in #announcements."), expected);
});

test("display formatting also cleans persisted onboarding HTML", () => {
  assert.equal(
    formatOnboardingMessageForDisplay("<p>Welcome &amp; thanks.</p><p><b>Next:</b><br>Ask a question.</p>"),
    "Welcome & thanks.\n\nNext:\nAsk a question.",
  );
});
