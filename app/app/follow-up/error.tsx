"use client";

import { AppScreen } from "@/components/memora/app-screen";

interface FollowUpErrorProps {
  reset: () => void;
}

export default function FollowUpError({ reset }: FollowUpErrorProps) {
  return (
    <AppScreen
      eyebrow="MEMORA / FOLLOW UP"
      title="Opportunity Queue"
      description="The source-backed queue could not be read this time."
      status="P2 / ERROR"
    >
      <section className="follow-up-error" role="alert" aria-labelledby="follow-up-error-title">
        <span className="section-label">QUEUE READ FAILED</span>
        <h2 id="follow-up-error-title">No opportunity was invented.</h2>
        <p>Try the queue again. Existing audience records and creator events were not changed.</p>
        <button className="primary-button" type="button" onClick={reset}>TRY AGAIN</button>
      </section>
    </AppScreen>
  );
}
