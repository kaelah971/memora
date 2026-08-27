import { AppScreen } from "@/components/memora/app-screen";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { DiscordImportPanel } from "@/components/memora/discord-import-panel";
import { DiscordOnboardingSettings } from "@/components/memora/discord-onboarding-settings";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { getDiscordConfigStatus, getDiscordOAuthConfigStatus } from "@/lib/discord/server";
import { getDiscordConnection, listDiscordConnectionChannels } from "@/lib/data/discord-connection";
import type { DiscordReadableChannel } from "@/lib/discord/channels";
import { getDiscordImportStatus } from "@/lib/data/discord-import";
import { getDiscordOnboardingSettings, listDiscordOnboardingReceipts } from "@/lib/data/discord-onboarding";
import { discordOnboardingSettingsView } from "@/lib/discord/onboarding-settings";
import { getCurrentWorkspaceContext } from "@/lib/workspaces/access";

export const dynamic = "force-dynamic";

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Never";
}

export default async function DiscordImportPage() {
  const config = getDiscordConfigStatus();
  const oauthConfig = getDiscordOAuthConfigStatus();
  const workspaceResult = await getCurrentWorkspaceContext();
  const demoMode = workspaceResult.data?.mode === "demo";
  let creator = null;
  const creatorError = workspaceResult.error;
  if (workspaceResult.data) creator = workspaceResult.data.creator;
  const statusResult = creator ? await getDiscordImportStatus(creator.id) : null;
  const connectionResult = creator ? await getDiscordConnection(creator.id) : null;
  const channelsResult = connectionResult?.data ? await listDiscordConnectionChannels(creator!.id) : null;
  const onboardingSettingsResult = connectionResult?.data && creator ? await getDiscordOnboardingSettings(creator.id) : null;
  const onboardingReceiptsResult = connectionResult?.data && creator ? await listDiscordOnboardingReceipts(creator.id) : null;
  const connection = connectionResult?.data
    ? {
        guildId: connectionResult.data.guild_id,
        guildName: connectionResult.data.guild_name,
        selectedChannelIds: connectionResult.data.selected_channel_ids,
        lastImportAt: connectionResult.data.last_import_at,
      }
    : null;
  const selectedChannelNames = connection
    ? (channelsResult?.data ?? [])
        .filter((channel) => connection.selectedChannelIds.includes(channel.id))
        .map((channel) => `#${channel.name}`)
    : [];
  const selectedChannelSummary = connection
    ? selectedChannelNames.join(", ") || connection.selectedChannelIds.join(", ")
    : config.monitoredChannelIds.join(", ");
  const onboardingSettings = connection
    ? discordOnboardingSettingsView(connectionResult!.data!.id, onboardingSettingsResult?.data ?? null, connection.selectedChannelIds)
    : null;
  const onboardingError = onboardingSettingsResult?.error ?? onboardingReceiptsResult?.error ?? null;
  const onboardingDebug = creator && connection && onboardingSettings ? {
    creatorId: creator.id,
    connectionId: connectionResult!.data!.id,
    guildId: connection.guildId,
    selectedChannelIds: connection.selectedChannelIds,
    loadedRowId: onboardingSettings.rowId,
    loadedUpdatedAt: onboardingSettings.updatedAt,
    loadedEnabled: onboardingSettings.enabled,
    loadedSendMode: onboardingSettings.sendMode,
  } : null;

  return (
    <AppScreen
      eyebrow="MEMORA / IMPORT / DISCORD"
      title="Bring the community closer."
      description="Read selected Discord channels into the same source-backed memory model as YouTube comments. Optional onboarding assist is separate, rule-bounded, and never a general-purpose Discord bot."
      status="P8 / COMMUNITY ONBOARDING"
    >
      {creatorError ? (
        <DataSetupState reason={creatorError} />
      ) : !creator ? (
        <ProductEmptyState eyebrow="NO CREATOR WORKSPACE" title="Discord has nowhere to import yet." description="Connect the deterministic creator workspace before importing community messages." />
      ) : statusResult && !statusResult.access.available ? (
        <DataSetupState reason={statusResult.error ?? "Discord import status could not be loaded."} />
      ) : statusResult?.error ? (
        <DataSetupState reason={statusResult.error} />
      ) : connectionResult?.error ? (
        <DataSetupState reason={connectionResult.error} />
      ) : (
        <>
          <section className="discord-connection" aria-labelledby="discord-connection-title">
            <div className="discord-connection__heading">
              <div>
                <span className="section-label">DISCORD / {connection ? "CONNECTED" : demoMode && config.ready ? "PUBLIC DEMO" : "NOT CONNECTED"}</span>
                <h2 id="discord-connection-title">{connection?.guildName ?? (demoMode && config.ready ? "Memora Community Demo" : "Connect your server.")}</h2>
                <p>Discord import is read-only. Optional onboarding assist is separate and limited to configured rules.</p>
              </div>
                <span className={`state-sticker ${connection || demoMode && config.ready ? "state-sticker--remembered" : "state-sticker--open"}`}>
                 {connection ? "USER CONNECTED" : demoMode && config.ready ? "READY TO READ" : "CONNECT DISCORD"}
              </span>
            </div>
            <dl className="discord-connection__facts">
              <div><dt className="data-label">GUILD ID</dt><dd>{connection?.guildId ?? config.configuredGuildId ?? "Not configured"}</dd></div>
              <div><dt className="data-label">MONITORED CHANNELS</dt><dd>{connection ? connection.selectedChannelIds.length : config.monitoredChannelIds.length}</dd></div>
              <div><dt className="data-label">SELECTED CHANNELS</dt><dd>{selectedChannelSummary || "None selected"}</dd></div>
              <div><dt className="data-label">LAST IMPORT</dt><dd>{formatDate(connection?.lastImportAt ?? statusResult?.data.lastImportedAt ?? null)}</dd></div>
            </dl>
          </section>
           <DiscordImportPanel
             config={config}
             oauthConfig={oauthConfig}
             connection={connection}
            initialChannels={(channelsResult?.data ?? []) as DiscordReadableChannel[]}
            initialChannelError={channelsResult?.error ?? null}
              initialLastImportedAt={connection?.lastImportAt ?? statusResult?.data.lastImportedAt ?? null}
              demoMode={demoMode}
           />
          <div className="discord-live-listener-note" role="note">
            <span className="section-label">LIVE DISCORD LISTENER</span>
            <p>For instant replies, run <code>npm run discord:listen</code> locally.</p>
            <p>Import is for historical sync; the listener is for real-time assistance in saved channels.</p>
          </div>
           <DiscordOnboardingSettings
             connectionId={connectionResult?.data?.id ?? null}
             channels={(channelsResult?.data ?? []) as DiscordReadableChannel[]}
             initialSettings={onboardingSettings}
             initialReceipts={onboardingReceiptsResult?.data ?? []}
             initialError={onboardingError}
             debug={onboardingDebug}
           />
        </>
      )}
    </AppScreen>
  );
}
