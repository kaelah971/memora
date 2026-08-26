"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DiscordReadableChannel } from "@/lib/discord/channels";
import { formatOnboardingMessageForDisplay } from "@/lib/discord/onboarding";
import type { OnboardingReceiptStatus, OnboardingSendMode, OnboardingTriggerType } from "@/lib/discord/onboarding-types";
import type { DiscordOnboardingReceipt, DiscordOnboardingSettingsInput } from "@/lib/data/discord-onboarding";

interface DiscordOnboardingSettingsView extends DiscordOnboardingSettingsInput {
  connectionId: string;
}

interface DiscordOnboardingSettingsProps {
  connectionId: string | null;
  channels: DiscordReadableChannel[];
  initialSettings: DiscordOnboardingSettingsView | null;
  initialReceipts: DiscordOnboardingReceipt[];
  initialError: string | null;
}

const channelFields = [
  ["welcomeChannelId", "WELCOME / DEFAULT CHANNEL", "Where join and manual welcome messages go."],
  ["resourceChannelId", "RESOURCE CHANNEL", "Where clear guide requests receive the beginner path."],
  ["questionChannelId", "QUESTION CHANNEL", "A source-backed place for follow-up questions."],
  ["supportChannelId", "SUPPORT CHANNEL", "A configured place to send members when they are stuck."],
  ["builderChannelId", "BUILDER / COMMUNITY CHANNEL", "A configured place for builder or community resources."],
] as const;

const sendModeLabels: Record<OnboardingSendMode, string> = {
  draft_only: "Draft only / safest",
  auto_send_welcome_only: "Auto-send welcomes only",
  auto_send_clear_guide_requests: "Auto-send clear guide requests",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function statusLabel(status: OnboardingReceiptStatus): string {
  return status === "sent" ? "SENT" : status === "drafted" ? "DRAFTED" : status === "skipped" ? "SKIPPED" : "FAILED";
}

function triggerLabel(trigger: OnboardingTriggerType): string {
  return trigger.replaceAll("_", " ").toUpperCase();
}

export function DiscordOnboardingSettings({
  connectionId,
  channels,
  initialSettings,
  initialReceipts,
  initialError,
}: DiscordOnboardingSettingsProps) {
  const router = useRouter();
  const [settings, setSettings] = useState<DiscordOnboardingSettingsView | null>(initialSettings);
  const [localReceipts, setLocalReceipts] = useState<DiscordOnboardingReceipt[]>([]);
  const [username, setUsername] = useState("New member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [notice, setNotice] = useState<string | null>(null);

  const receipts = [
    ...localReceipts,
    ...initialReceipts.filter((receipt) => !localReceipts.some((localReceipt) => localReceipt.id === receipt.id)),
  ];

  function updateSetting<K extends keyof DiscordOnboardingSettingsInput>(key: K, value: DiscordOnboardingSettingsInput[K]): void {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  async function saveSettings(): Promise<void> {
    if (!settings) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/discord/onboarding/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const body = (await response.json().catch(() => null)) as { settings?: DiscordOnboardingSettingsView; error?: string } | null;
      if (!response.ok || !body?.settings) throw new Error(body?.error ?? "Onboarding settings could not be saved.");
      setSettings(body.settings);
      setNotice("Onboarding settings saved.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Onboarding settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function testOnboarding(triggerType: "manual_test" | "member_join"): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/discord/onboarding/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, triggerType }),
      });
      const body = (await response.json().catch(() => null)) as { receipt?: DiscordOnboardingReceipt; error?: string } | null;
      if (!response.ok || !body?.receipt) throw new Error(body?.error ?? "The onboarding test could not be completed.");
      setLocalReceipts((current) => [body.receipt!, ...current.filter((receipt) => receipt.id !== body.receipt!.id)]);
      setNotice(`${triggerType === "member_join" ? "Simulated welcome" : "Onboarding test"} recorded as ${statusLabel(body.receipt.status).toLowerCase()}.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The onboarding test could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="discord-onboarding" aria-labelledby="discord-onboarding-title" aria-busy={busy}>
      <div className="discord-onboarding__heading">
        <div>
          <span className="section-label">P8 / MIND-GUIDED ONBOARDING</span>
          <h2 id="discord-onboarding-title">Help new members find their first step.</h2>
          <p>Safe tests can create draft receipts even while onboarding rules are off. Real onboarding requires rules to be enabled.</p>
        </div>
        <span className="state-sticker state-sticker--remembered">{settings?.enabled ? "ONBOARDING ENABLED" : "ONBOARDING OFF"}</span>
      </div>

      {!connectionId ? (
        <div className="discord-onboarding__empty">
          <span className="data-label">DISCORD CONNECTION REQUIRED</span>
          <p>Connect Discord and save at least one channel before configuring onboarding.</p>
        </div>
      ) : settings ? (
        <>
          <div className="discord-onboarding__controls">
            <label className="discord-onboarding__toggle">
              <input type="checkbox" checked={settings.enabled} onChange={(event) => updateSetting("enabled", event.target.checked)} disabled={busy} />
              <span>
                <strong>Enable onboarding rules</strong>
                <small>When off, real onboarding rules do not generate messages. Safe tests can still create draft receipts.</small>
              </span>
            </label>
            <div className="discord-onboarding__field">
              <label className="data-label" htmlFor="discord-onboarding-send-mode">SEND MODE</label>
              <select id="discord-onboarding-send-mode" value={settings.sendMode} onChange={(event) => updateSetting("sendMode", event.target.value as OnboardingSendMode)} disabled={busy}>
                {Object.entries(sendModeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <p>Draft-only is the safest starting point. Auto-send never applies to unclear or complex messages.</p>
            </div>
            {channelFields.map(([key, label, detail]) => (
              <div className="discord-onboarding__field" key={key}>
                <label className="data-label" htmlFor={`discord-onboarding-${key}`}>{label}</label>
                <select id={`discord-onboarding-${key}`} value={settings[key] ?? ""} onChange={(event) => updateSetting(key, event.target.value || null)} disabled={busy}>
                  <option value="">Not configured</option>
                  {channels.map((channel) => <option key={channel.id} value={channel.id}>#{channel.name}</option>)}
                </select>
                <p>{detail}</p>
              </div>
            ))}
            <div className="discord-onboarding__field discord-onboarding__field--wide">
              <label className="data-label" htmlFor="discord-onboarding-guide">BEGINNER GUIDE TEXT</label>
              <textarea id="discord-onboarding-guide" rows={4} maxLength={2000} value={settings.beginnerGuideText} onChange={(event) => updateSetting("beginnerGuideText", event.target.value)} disabled={busy} />
              <p>Mind may use this text, the configured channel labels, and prior member memory. It may not invent resources.</p>
            </div>
          </div>
          <div className="discord-onboarding__actions">
            <button className="primary-button" type="button" onClick={saveSettings} disabled={busy}>{busy ? "SAVING..." : "SAVE ONBOARDING SETTINGS"}</button>
            <span className="data-label">RULES ARE SERVER-SIDE / {sendModeLabels[settings.sendMode].toUpperCase()}</span>
          </div>

          <div className="discord-onboarding__test">
            <div>
              <span className="section-label">SAFE TEST RECEIPT</span>
              <h3>Test the onboarding path without arbitrary message text.</h3>
              <p>Enter a member handle only. Memora supplies the prompt, settings, and allowed channel server-side.</p>
            </div>
            <div className="discord-onboarding__test-controls">
              <label className="data-label" htmlFor="discord-onboarding-test-member">MEMBER HANDLE</label>
              <input id="discord-onboarding-test-member" value={username} maxLength={100} onChange={(event) => setUsername(event.target.value)} disabled={busy} />
              <div className="discord-onboarding__test-buttons">
                <button className="secondary-button" type="button" onClick={() => testOnboarding("manual_test")} disabled={busy}>TEST ONBOARDING MESSAGE</button>
                <button className="secondary-button" type="button" onClick={() => testOnboarding("member_join")} disabled={busy}>SIMULATE NEW MEMBER JOINED</button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {notice ? <p className="discord-onboarding__notice" role="status">{notice}</p> : null}
      {error ? <p className="discord-onboarding__error" role="alert">{error}</p> : null}
      <div className="discord-onboarding__boundary">
        <span className="data-label">SAFETY BOUNDARY</span>
        <p>Import remains read-only. Assist/send is separate, limited to configured rules and saved channels, and every attempted message gets a receipt.</p>
      </div>

      <section className="discord-onboarding__receipts" aria-labelledby="discord-onboarding-receipts-title">
        <div className="discord-onboarding__receipts-heading">
          <div>
            <span className="section-label">ONBOARDING RECEIPTS</span>
            <h3 id="discord-onboarding-receipts-title">What Memora generated or sent.</h3>
          </div>
          <span className="data-label">{receipts.length} RECENT</span>
        </div>
        {receipts.length > 0 ? (
          <ul>
            {receipts.map((receipt) => (
              <li key={receipt.id}>
                <div>
                  <strong>{receipt.discord_username}</strong>
                  <span className="data-label">{triggerLabel(receipt.trigger_type)} / {statusLabel(receipt.status)} / {formatDate(receipt.created_at)}</span>
                </div>
                <p>{formatOnboardingMessageForDisplay(receipt.generated_message || receipt.reason)}</p>
                <span className="data-label">{receipt.reason}{receipt.sent_message_id ? ` / SENT MESSAGE ${receipt.sent_message_id}` : ""}{receipt.mind_conversation_id ? ` / MIND CONVERSATION ${receipt.mind_conversation_id}` : ""}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="discord-onboarding__empty">No onboarding receipts yet. Save the rules, then run the safe test.</p>
        )}
      </section>
    </section>
  );
}
