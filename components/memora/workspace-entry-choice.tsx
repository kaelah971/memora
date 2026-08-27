import { PrimaryButton } from "@/components/memora/primary-button";
import { StateSticker } from "@/components/memora/state-sticker";

interface WorkspaceEntryChoiceProps {
  demoAvailable: boolean;
}

export function WorkspaceEntryChoice({ demoAvailable }: WorkspaceEntryChoiceProps) {
  return (
    <section className="workspace-entry" aria-labelledby="workspace-entry-title">
      <div className="workspace-entry__heading">
        <span className="section-label">BEFORE YOU ENTER</span>
        <h2 id="workspace-entry-title">Choose the desk you want to open.</h2>
        <p>
          The public demo is ready to explore. Your own workspace keeps your sources, memories and
          follow-up decisions private.
        </p>
      </div>
      <div className="workspace-entry__options">
        <article className="workspace-entry__option workspace-entry__option--demo">
          <StateSticker tone="active">PUBLIC DEMO</StateSticker>
          <h3>Explore the public memory</h3>
          <p>See Alex&apos;s audience thread, open questions and follow-up proof without an account.</p>
          {demoAvailable ? (
            <PrimaryButton href="/api/workspace/mode?mode=demo&next=/app">VIEW PUBLIC DEMO</PrimaryButton>
          ) : (
            <span className="data-label workspace-entry__unavailable">PUBLIC DEMO IS NOT ENABLED HERE</span>
          )}
        </article>
        <article className="workspace-entry__option workspace-entry__option--mine">
          <StateSticker tone="approved">MY WORKSPACE</StateSticker>
          <h3>Build your own memory desk</h3>
          <p>Create a private workspace for your audience sources, memories and creator-approved actions.</p>
          <PrimaryButton href="/api/workspace/mode?mode=mine&next=%2Flogin%3Fnext%3D%2Fapp">CREATE MY WORKSPACE</PrimaryButton>
        </article>
      </div>
      <p className="workspace-entry__note hand-note">No account is needed to look around. Sign in when you are ready to make it yours.</p>
    </section>
  );
}
