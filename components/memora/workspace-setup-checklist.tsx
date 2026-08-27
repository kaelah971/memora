import { SecondaryLink } from "@/components/memora/secondary-link";

const setupSteps = [
  ["01", "Connect YouTube", "Bring a channel and choose the public videos Memora should read.", "/app/import"],
  ["02", "Connect Discord", "Install the bot, choose readable channels and import selected messages.", "/app/import/discord"],
  ["03", "Review the thread", "Keep source evidence visible while Memora builds memory and follow-up opportunities.", "/app/memory"],
] as const;

export function WorkspaceSetupChecklist({ basePath }: { basePath: string }) {
  return (
    <section className="workspace-setup-checklist" aria-labelledby="workspace-setup-title">
      <div>
        <span className="section-label">YOUR WORKSPACE / START HERE</span>
        <h2 id="workspace-setup-title">Build your first proof thread.</h2>
        <p>Connect a source to replace this checklist with your own evidence. The public demo remains available from the workspace switcher.</p>
      </div>
      <ol>
        {setupSteps.map(([number, title, description, href]) => (
          <li key={number}>
            <span className="data-label">{number}</span>
            <div>
              <h3>{title}</h3>
              <p>{description}</p>
               <SecondaryLink href={`${basePath}${href.slice("/app".length)}`}>OPEN STEP <span aria-hidden="true">↗</span></SecondaryLink>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
