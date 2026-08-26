export const onboardingSendModes = [
  "draft_only",
  "auto_send_welcome_only",
  "auto_send_clear_guide_requests",
] as const;
export type OnboardingSendMode = (typeof onboardingSendModes)[number];

export const onboardingTriggerTypes = [
  "member_join",
  "first_message",
  "guide_request",
  "manual_test",
] as const;
export type OnboardingTriggerType = (typeof onboardingTriggerTypes)[number];

export const onboardingReceiptStatuses = ["drafted", "sent", "skipped", "failed"] as const;
export type OnboardingReceiptStatus = (typeof onboardingReceiptStatuses)[number];

export function isOnboardingSendMode(value: unknown): value is OnboardingSendMode {
  return typeof value === "string" && onboardingSendModes.includes(value as OnboardingSendMode);
}

export function isOnboardingTriggerType(value: unknown): value is OnboardingTriggerType {
  return typeof value === "string" && onboardingTriggerTypes.includes(value as OnboardingTriggerType);
}
