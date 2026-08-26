import { AppScreen } from "@/components/memora/app-screen";

export default function FollowUpLoading() {
  return (
    <AppScreen
      eyebrow="MEMORA / FOLLOW UP"
      title="Opportunity Queue"
      description="Loading source-backed questions and creator moments."
      status="P2 / LOADING"
    >
      <section className="follow-up-loading" aria-busy="true" aria-labelledby="follow-up-loading-title">
        <span className="section-label">READING THE MEMORY THREAD</span>
        <h2 id="follow-up-loading-title">Finding the next useful conversation.</h2>
        <div className="follow-up-loading__bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
    </AppScreen>
  );
}
