const walkthroughSteps = [
  {
    label: "IMPORT",
    title: "See the source connections.",
    description: "See the connected YouTube channel and Discord community sources.",
    href: "/app/demo/import",
    action: "OPEN IMPORT",
  },
  {
    label: "MEMORY",
    title: "Meet the audience records.",
    description: "See source-backed audience records from YouTube and Discord.",
    href: "/app/demo/memory",
    action: "OPEN MEMORY",
  },
  {
    label: "QUEUE",
    title: "Follow the open question.",
    description: "See how Memora connects old questions to new follow-up moments.",
    href: "/app/demo/follow-up",
    action: "OPEN FOLLOW-UP",
  },
  {
    label: "PROOF",
    title: "Inspect the receipts.",
    description: "Inspect posted YouTube proof, Discord onboarding receipts, and Minds continuity.",
    href: "/app/demo/proof",
    action: "OPEN PROOF",
  },
] as const;

export function DemoWalkthrough() {
  return (
    <section className="demo-walkthrough" aria-labelledby="demo-walkthrough-title">
      <header className="demo-walkthrough__header">
        <div>
          <span className="section-label">DEMO WALKTHROUGH / 4 STOPS</span>
          <h2 id="demo-walkthrough-title">See the whole thread in four stops.</h2>
          <p>Start with the sources, then follow one audience moment through memory, action and proof.</p>
        </div>
        <span className="state-sticker state-sticker--active">PUBLIC DEMO</span>
      </header>
      <ol className="demo-walkthrough__steps">
        {walkthroughSteps.map((step, index) => (
          <li className="demo-walkthrough__step" key={step.label}>
            <span className="demo-walkthrough__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className="demo-walkthrough__step-body">
              <span className="data-label">{step.label}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <a className="demo-walkthrough__link" href={step.href}>
                {step.action} <span aria-hidden="true">↗</span>
              </a>
            </div>
          </li>
        ))}
      </ol>
      <p className="demo-walkthrough__note">
        This public demo uses a seeded creator workspace. <a href="/login?next=%2Fapp%2Fmy">Sign in to create your own isolated workspace.</a>
      </p>
    </section>
  );
}
