import { AppScreen } from "@/components/memora/app-screen";
import { CreatorVoiceSettings } from "@/components/memora/creator-voice-settings";
import { DataSetupState } from "@/components/memora/data-setup-state";
import { ProductEmptyState } from "@/components/memora/product-empty-state";
import { getCreatorWorkspace } from "@/lib/data/creators";
import { normalizeCreatorVoice } from "@/types/data";

const controlNotes = [
  ["PUBLIC CONTEXT", "The MVP boundary is public audience context selected by the creator."],
  ["SOURCE EVIDENCE", "Every future recommendation should keep its source message visible."],
  ["CREATOR APPROVAL", "Memora prepares a next step; the creator decides what leaves the workspace."],
  ["CLEARABLE DATA", "Dismiss and clear-data controls belong here before real memory is connected."],
] as const;

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const creatorResult = await getCreatorWorkspace();

  return (
    <AppScreen
      eyebrow="MEMORA / SETTINGS"
      title="Creator control"
      description="The settings surface records the boundaries that future integrations must respect."
      status="P6 / CREATOR CONTROL"
    >
      {!creatorResult.access.available ? (
        <DataSetupState reason={creatorResult.error ?? "Supabase data access is not configured."} />
      ) : !creatorResult.data ? (
        <ProductEmptyState
          eyebrow="NO CREATOR WORKSPACE"
          title="Creator settings need a workspace first."
          description="Connect the deterministic creator workspace before choosing a voice preference."
          href="/app/import"
          actionLabel="Open import"
        />
      ) : (
        <>
          <CreatorVoiceSettings initialVoice={normalizeCreatorVoice(creatorResult.data.voice_preference)} />
          <section className="settings-panel" aria-labelledby="settings-panel-title">
            <div className="settings-panel__intro">
              <span className="section-label">FOUNDATION COMMITMENTS</span>
              <h2 id="settings-panel-title">Memory should stay inspectable and yours to clear.</h2>
            </div>
            <div className="settings-panel__list">
              {controlNotes.map(([label, copy]) => (
                <div className="settings-panel__item" key={label}>
                  <span className="data-label">{label}</span>
                  <p>{copy}</p>
                </div>
              ))}
              <div className="settings-panel__item">
                <span className="data-label">SAFETY BOUNDARY</span>
                <p>Creator approves every draft. Nothing posts without final confirmation. Memory remains source-backed.</p>
              </div>
            </div>
          </section>
        </>
      )}
    </AppScreen>
  );
}
