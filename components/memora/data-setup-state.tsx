interface DataSetupStateProps {
  reason: string;
}

export function DataSetupState({ reason }: DataSetupStateProps) {
  return (
    <section className="data-setup-state" aria-labelledby="data-setup-title">
      <span className="section-label">DATABASE SETUP</span>
      <h2 id="data-setup-title">The deterministic workspace is not connected.</h2>
      <p>{reason}</p>
      <span className="data-label">No browser credential has been elevated.</span>
    </section>
  );
}
