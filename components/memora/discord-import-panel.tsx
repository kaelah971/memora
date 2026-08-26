"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { DiscordReadableChannel } from "@/lib/discord/channels";
import type { DiscordConfigStatus, DiscordOAuthConfigStatus } from "@/lib/discord/config";
import type { DiscordImportSummary } from "@/lib/discord/import";

interface DiscordConnectionView {
  guildId: string;
  guildName: string;
  selectedChannelIds: string[];
  lastImportAt: string | null;
}

interface DiscordImportPanelProps {
  config: DiscordConfigStatus;
  oauthConfig: DiscordOAuthConfigStatus;
  connection: DiscordConnectionView | null;
  initialChannels: DiscordReadableChannel[];
  initialChannelError: string | null;
  initialLastImportedAt: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function DiscordImportPanel({
  config,
  oauthConfig,
  connection: initialConnection,
  initialChannels,
  initialChannelError,
  initialLastImportedAt,
}: DiscordImportPanelProps) {
  const router = useRouter();
  const [connection, setConnection] = useState(initialConnection);
  const [channels, setChannels] = useState(initialChannels);
  const [selectedChannelIds, setSelectedChannelIds] = useState(() => new Set(initialConnection?.selectedChannelIds ?? []));
  const [summary, setSummary] = useState<DiscordImportSummary | null>(null);
  const [error, setError] = useState<string | null>(initialChannelError);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [savingChannels, setSavingChannels] = useState(false);
  const [importing, setImporting] = useState(false);
  const lastImportedAt = summary ? new Date().toISOString() : connection?.lastImportAt ?? initialLastImportedAt;

  async function loadChannels(): Promise<void> {
    setLoadingChannels(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/discord/channels", { cache: "no-store" });
      const body = (await response.json().catch(() => null)) as { channels?: DiscordReadableChannel[]; error?: string } | null;
      if (!response.ok || !body?.channels) throw new Error(body?.error ?? "Discord channels could not be loaded.");
      setChannels(body.channels);
      setSelectedChannelIds(new Set(body.channels.filter((channel) => channel.selected).map((channel) => channel.id)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord channels could not be loaded.");
    } finally {
      setLoadingChannels(false);
    }
  }

  async function saveChannels(): Promise<void> {
    setSavingChannels(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/discord/save-channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds: [...selectedChannelIds] }),
      });
      const body = (await response.json().catch(() => null)) as {
        connection?: { guildId: string; guildName: string; selectedChannelIds: string[] };
        error?: string;
      } | null;
      if (!response.ok || !body?.connection) throw new Error(body?.error ?? "Discord channels could not be saved.");
      setConnection((current) => current ? { ...current, selectedChannelIds: body.connection!.selectedChannelIds } : current);
      setChannels((current) => current.map((channel) => ({ ...channel, selected: body.connection!.selectedChannelIds.includes(channel.id) })));
      setNotice("Discord channel selection saved.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord channels could not be saved.");
    } finally {
      setSavingChannels(false);
    }
  }

  async function importMessages(): Promise<void> {
    setImporting(true);
    setError(null);
    setNotice(null);
    setSummary(null);
    try {
      const response = await fetch("/api/discord/import", { method: "POST" });
      const body = (await response.json().catch(() => null)) as { summary?: DiscordImportSummary; error?: string } | null;
      if (!response.ok || !body?.summary) throw new Error(body?.error ?? "Discord messages could not be imported.");
      setSummary(body.summary);
      setConnection((current) => current ? { ...current, lastImportAt: new Date().toISOString() } : current);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Discord messages could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  const canImport = connection ? selectedChannelIds.size > 0 : config.ready;

  return (
    <section className="discord-import" aria-labelledby="discord-import-panel-title" aria-busy={importing || loadingChannels || savingChannels}>
      <div className="discord-import__heading">
        <div>
          <span className="section-label">READ-ONLY COMMUNITY MEMORY</span>
          <h2 id="discord-import-panel-title">Import Discord messages.</h2>
          <p>Memora reads only selected text channels, ignores bot messages when Discord identifies them, and keeps onboarding assist separate from import.</p>
        </div>
        <button className="primary-button" type="button" onClick={importMessages} disabled={!canImport || importing || loadingChannels || savingChannels}>
          {importing ? "IMPORTING DISCORD..." : canImport ? "IMPORT DISCORD MESSAGES" : "SELECT CHANNELS FIRST"}
        </button>
      </div>

      <div className="discord-import__status" role="status" aria-live="polite">
        {importing ? "Reading the selected Discord channels..." : `Last import: ${formatDate(lastImportedAt)}`}
      </div>

      {connection ? (
        <section className="discord-channel-picker" aria-labelledby="discord-channel-picker-title">
          <div className="discord-channel-picker__heading">
            <div>
              <span className="section-label">CONNECTED GUILD / {connection.guildName}</span>
              <h3 id="discord-channel-picker-title">Choose readable channels.</h3>
              <p>Only channels returned by Discord for this connected guild can be saved.</p>
            </div>
            <button className="secondary-button" type="button" onClick={loadChannels} disabled={loadingChannels || savingChannels}>
              {loadingChannels ? "LOADING..." : "REFRESH CHANNELS"}
            </button>
          </div>
          {channels.length > 0 ? (
            <fieldset className="discord-channel-picker__list">
              <legend className="sr-only">Discord channels to import</legend>
              {channels.map((channel) => (
                <label className="discord-channel-picker__channel" key={channel.id}>
                  <input
                    type="checkbox"
                    checked={selectedChannelIds.has(channel.id)}
                    onChange={(event) => {
                      setSelectedChannelIds((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(channel.id);
                        else next.delete(channel.id);
                        return next;
                      });
                    }}
                  />
                  <span>
                    <strong># {channel.name}</strong>
                    <small>{channel.type === 5 ? "Announcement channel" : "Text channel"} / read-only</small>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="discord-channel-picker__empty">{error ?? "No readable text channels were returned."}</p>
          )}
          <div className="discord-channel-picker__actions">
            <span className="data-label">{selectedChannelIds.size} SELECTED / {channels.length} AVAILABLE</span>
            <button className="secondary-button" type="button" onClick={saveChannels} disabled={savingChannels || loadingChannels || channels.length === 0}>
              {savingChannels ? "SAVING..." : "SAVE CHANNELS"}
            </button>
          </div>
        </section>
      ) : (
        <section className="discord-connect-card" aria-labelledby="discord-connect-title">
          <div>
            <span className="section-label">USER-CONNECTED SERVER</span>
            <h3 id="discord-connect-title">Connect Discord to choose your channels.</h3>
            <p>Memora will request only bot installation and application-command access, then verify the guild before saving it.</p>
          </div>
          {oauthConfig.ready ? (
            <a className="primary-button" href="/api/discord/connect">CONNECT DISCORD</a>
          ) : (
            <span className="state-sticker state-sticker--open">OAUTH CONFIG NEEDED</span>
          )}
        </section>
      )}

      {connection ? <p className="discord-import__safety">The connected Discord server is user-selected. Imports are bounded, idempotent, and read-only.</p> : config.ready ? <p className="discord-import__safety">Developer demo mode is active. Connect a Discord server above to replace the env-configured channels.</p> : null}
      {notice ? <p className="discord-import__notice" role="status">{notice}</p> : null}
      {error ? <p className="discord-import__error" role="alert">{error}</p> : null}

      {summary ? (
        <section className="discord-import-summary" aria-labelledby="discord-import-summary-title">
          <span className="section-label">DISCORD IMPORT COMPLETE</span>
          <h3 id="discord-import-summary-title">Community facts are in Memora.</h3>
          <div className="discord-import-summary__counts">
            <span><strong>{summary.channelsRead}</strong> channels read</span>
            <span><strong>{summary.messagesFetched}</strong> messages found</span>
            <span><strong>{summary.messagesImported}</strong> new messages</span>
            <span><strong>{summary.audienceMembersFound}</strong> people found</span>
            <span><strong>{summary.opportunitiesFound}</strong> opportunities found</span>
          </div>
          <span className="data-label">IMPORT READ-ONLY / ONBOARDING SEND SEPARATE</span>
          <ul className="discord-import-summary__channels">
            {summary.channels.map((channel) => (
              <li key={channel.channelId}>
                <strong>{channel.channelName}</strong>
                <span>{channel.messagesImported} imported / {channel.messagesAlreadyKnown} already known / {channel.botMessagesIgnored} bot messages ignored</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
