import { AppScreen } from "@/components/memora/app-screen";
import { PrimaryButton } from "@/components/memora/primary-button";
import { YouTubeImportPanel } from "@/components/memora/youtube-import-panel";
import {
  getDevelopmentCreator,
  getPublicYouTubeConnection,
  getYouTubeConfigStatus,
  type YouTubeConnectionPublic,
} from "@/lib/youtube/server";

export const dynamic = "force-dynamic";

interface ImportPageProps {
  searchParams: Promise<{ youtube?: string }>;
}

const notices: Record<string, string> = {
  connected: "YouTube is connected. The channel identity below came from Google.",
  oauth_denied: "YouTube authorization was cancelled. You can try again whenever you are ready.",
  invalid_state: "The authorization window expired or could not be verified. Start a new connection.",
  config_missing: "Add the documented Google OAuth and token-encryption variables to .env.local before connecting.",
  workspace_unavailable: "Sign in to connect your own YouTube channel, or choose View Demo Workspace for the public proof workspace.",
  auth_required: "Reconnect YouTube so Memora can read comments with the current permission.",
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function ConnectionSetup({ message }: { message: string }) {
  return (
    <section className="youtube-setup-state" aria-labelledby="youtube-setup-title">
      <span className="section-label">YOUTUBE / NOT CONNECTED</span>
      <h2 id="youtube-setup-title">Connect YouTube.</h2>
      <p>{message}</p>
      <span className="hand-note">Bring real public conversations into the memory desk.</span>
    </section>
  );
}

function ConnectedChannel({ connection }: { connection: YouTubeConnectionPublic }) {
  return (
    <section className="youtube-connection" aria-labelledby="youtube-connection-title">
      <div className="youtube-connection__heading">
        <div>
          <span className="section-label">YOUTUBE / CONNECTED CHANNEL</span>
          <h2 id="youtube-connection-title">{connection.youtube_channel_title}</h2>
          <p>{connection.youtube_channel_handle ?? "Channel handle not returned by YouTube."}</p>
        </div>
        <div className="youtube-connection__heading-actions">
          <span className="state-sticker state-sticker--remembered">CONNECTED</span>
          <PrimaryButton href="/api/youtube/connect">RECONNECT YOUTUBE</PrimaryButton>
        </div>
      </div>
      <dl className="youtube-connection__facts">
        <div>
          <dt className="data-label">CHANNEL ID</dt>
          <dd>{connection.youtube_channel_id}</dd>
        </div>
        <div>
          <dt className="data-label">CONNECTED</dt>
          <dd>{formatDate(connection.connected_at)}</dd>
        </div>
        <div>
          <dt className="data-label">LAST SYNCED</dt>
          <dd>{formatDate(connection.last_synced_at)}</dd>
        </div>
      </dl>
    </section>
  );
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const params = await searchParams;
  const notice = params.youtube ? notices[params.youtube] : null;
  const config = getYouTubeConfigStatus();
  let connection: YouTubeConnectionPublic | null = null;
  let connectionError: string | null = null;

  if (config.googleConfigured && config.tokenStorageConfigured) {
    try {
      const creator = await getDevelopmentCreator();
      connection = await getPublicYouTubeConnection(creator.id);
    } catch {
      connectionError = "The creator workspace is not available for this YouTube connection. For a production hackathon demo, set MEMORA_DEMO_WORKSPACE_ACCESS=enabled on the server.";
    }
  }

  return (
    <AppScreen
      eyebrow="MEMORA / IMPORT"
      title="Bring the source closer."
      description="Connect one YouTube channel, choose one of its videos, and import bounded public comment facts. Memora does not interpret them here."
      status="YOUTUBE INGESTION / P1.5"
    >
      {notice ? <p className="youtube-import__notice" role="status">{notice}</p> : null}
      {connection ? (
        <>
          <ConnectedChannel connection={connection} />
          <YouTubeImportPanel />
        </>
      ) : connectionError ? (
        <ConnectionSetup message={connectionError} />
      ) : !config.googleConfigured || !config.tokenStorageConfigured ? (
        <ConnectionSetup message="Configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and YOUTUBE_TOKEN_ENCRYPTION_KEY in the server environment first." />
      ) : (
        <section className="youtube-setup-state" aria-labelledby="youtube-connect-title">
          <span className="section-label">YOUTUBE / NOT CONNECTED</span>
          <h2 id="youtube-connect-title">Connect YouTube.</h2>
          <p>Memora only reads and imports comments here. It does not post replies or manage your channel.</p>
          <PrimaryButton href="/api/youtube/connect">CONNECT YOUTUBE</PrimaryButton>
        </section>
      )}
      <section className="import-source-switcher" aria-labelledby="import-source-switcher-title">
        <div>
          <span className="section-label">COMMUNITY MEMORY / P8</span>
          <h2 id="import-source-switcher-title">Import selected Discord channels.</h2>
          <p>Discord import remains read-only. Optional onboarding assist is separately rule-bounded and never replies to unrelated messages.</p>
        </div>
        <a className="secondary-link" href="/app/import/discord">OPEN DISCORD IMPORT <span aria-hidden="true">↗</span></a>
      </section>
    </AppScreen>
  );
}
