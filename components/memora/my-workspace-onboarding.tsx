import { PrimaryButton } from "@/components/memora/primary-button";
import { StateSticker } from "@/components/memora/state-sticker";

const sourceActions = [
  {
    label: "YOUTUBE",
    title: "Connect YouTube",
    description: "Import comments from selected videos.",
    href: "/app/my/import",
    tone: "remembered" as const,
  },
  {
    label: "DISCORD",
    title: "Connect Discord",
    description: "Import selected community channels.",
    href: "/app/my/import/discord",
    tone: "active" as const,
  },
  {
    label: "EXAMPLE",
    title: "View Public Demo",
    description: "See a completed Memora workspace first.",
    href: "/app/demo",
    tone: "open" as const,
  },
] as const;

const setupPath = ["Connect source", "Import messages", "Review memory", "Follow up", "Proof"] as const;

export function MyWorkspaceOnboarding() {
  return (
    <section className="my-workspace-onboarding" aria-labelledby="my-workspace-onboarding-title">
      <header className="my-workspace-onboarding__header">
        <div>
          <span className="section-label">YOUR FIRST THREAD</span>
          <h2 id="my-workspace-onboarding-title">Start by connecting a source.</h2>
          <p>Memora needs source-backed audience moments before it can remember, notice, and suggest follow-ups.</p>
        </div>
        <span className="state-sticker state-sticker--open">WORKSPACE IS EMPTY</span>
      </header>
      <div className="my-workspace-onboarding__actions">
        {sourceActions.map((action) => (
          <article className="my-workspace-onboarding__action" key={action.label}>
            <StateSticker tone={action.tone}>{action.label}</StateSticker>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
            <PrimaryButton href={action.href}>{action.title}</PrimaryButton>
          </article>
        ))}
      </div>
      <div className="my-workspace-onboarding__path">
        <span className="section-label">SETUP PATH</span>
        <ol>
          {setupPath.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
