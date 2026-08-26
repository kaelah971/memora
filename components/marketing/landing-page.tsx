import { alex, alexThread, jordan, maya } from "@/data/demo";
import { AudienceMemoryCard } from "@/components/memora/audience-memory-card";
import { BrowserWindow } from "@/components/memora/browser-window";
import { MemoryThread } from "@/components/memora/memory-thread";
import { PrimaryButton } from "@/components/memora/primary-button";
import { ProofPanel } from "@/components/memora/proof-panel";
import { SecondaryLink } from "@/components/memora/secondary-link";
import { SourceFragment } from "@/components/memora/source-fragment";
import { StateSticker } from "@/components/memora/state-sticker";
import { WindowNavigation, type WindowNavItem } from "@/components/memora/window-navigation";

const landingNavigation = [
  { href: "#top", label: "MEMORA" },
  { href: "#memory", label: "MEMORY" },
  { href: "#how-it-works", label: "HOW IT WORKS" },
  { href: "#proof", label: "PROOF" },
] satisfies readonly WindowNavItem[];

export function LandingPage() {
  return (
    <div className="marketing-page" id="top">
      <header className="site-header">
        <div className="site-header__inner">
          <a className="wordmark" href="#top">
            <span className="wordmark__dot" aria-hidden="true" />
            MEMORA
          </a>
          <span className="site-header__descriptor">PERSISTENT AUDIENCE MEMORY</span>
          <PrimaryButton href="/app">OPEN DEMO</PrimaryButton>
        </div>
      </header>

      <main>
        <section className="hero-section page-section" aria-labelledby="hero-title">
          <BrowserWindow chromeLabel="memora / memory thread" title="Memora memory thread">
            <WindowNavigation
              items={landingNavigation}
              action={<PrimaryButton href="/app">OPEN DEMO</PrimaryButton>}
            />
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="circled-label">MEMORA</span>
                <h1 id="hero-title">
                  REMEMBER THE <span className="hero-title__circled">RELATIONSHIP.</span>
                </h1>
                <p className="hero-copy__lead">
                  Memora helps creators remember the people, questions and promises behind their
                  audience&mdash;then shows who to follow up with next.
                </p>
                <div className="hero-actions">
                  <PrimaryButton href="/app">SEE THE MEMORY DEMO</PrimaryButton>
                  <SecondaryLink href="#how-it-works">SEE HOW IT REMEMBERS</SecondaryLink>
                </div>
                <p className="hand-note hero-copy__note">A growing audience should not erase the people in it.</p>
              </div>
              <div className="hero-evidence">
                <div className="evidence-heading">
                  <span className="section-label">THE FIRST THREAD</span>
                  <span className="data-label">ALEX / 04 MOMENTS</span>
                </div>
                <MemoryThread nodes={alexThread} />
              </div>
            </div>
          </BrowserWindow>
        </section>

        <section className="story-section page-section" id="problem" aria-labelledby="problem-title">
          <div className="section-intro">
            <span className="section-label">THE PROBLEM</span>
            <h2 id="problem-title">Your audience is talking. The context is disappearing.</h2>
            <p className="body-handwritten">
              Platforms keep messages in separate feeds. The creator is left to remember the
              relationship by hand.
            </p>
          </div>
          <BrowserWindow chromeLabel="creator desk / scattered sources" title="Scattered audience sources">
            <div className="problem-window">
              <div className="problem-window__rail">
                <span className="data-label">SEPARATE SOURCES</span>
                <div className="problem-window__source-list">
                  <SourceFragment interaction={alex.primaryInteraction} polaroid />
                  <SourceFragment interaction={maya.primaryInteraction} polaroid />
                  <SourceFragment interaction={jordan.primaryInteraction} polaroid />
                </div>
              </div>
              <div className="problem-window__loss">
                <span className="section-label">WHAT GETS LOST</span>
                <div className="lost-line">
                  <span>WHO ASKED?</span>
                  <strong>not connected</strong>
                </div>
                <div className="lost-line">
                  <span>WHAT DID I PROMISE?</span>
                  <strong>easy to forget</strong>
                </div>
                <div className="lost-line">
                  <span>DOES THIS NEW VIDEO HELP?</span>
                  <strong>no one is looking</strong>
                </div>
                <p className="hand-note">Messages stay. Meaning slips away.</p>
              </div>
            </div>
          </BrowserWindow>
        </section>

        <section className="story-section page-section" id="memory" aria-labelledby="memory-title">
          <div className="section-intro section-intro--split">
            <div>
              <span className="section-label">01 / REMEMBER</span>
              <h2 id="memory-title">Keep the moments worth remembering.</h2>
            </div>
            <p>
              A source message stays attached to its meaning. Memora carries the open loop
              forward instead of reducing a person to a row in a feed.
            </p>
          </div>
          <BrowserWindow chromeLabel="memora / audience memory" title="Audience memory example">
            <div className="memory-window">
              <SourceFragment interaction={alex.primaryInteraction} polaroid />
              <div className="memory-window__arrow" aria-hidden="true">
                &rarr;
              </div>
              <AudienceMemoryCard member={alex} />
            </div>
          </BrowserWindow>
        </section>

        <section className="story-section page-section" id="how-it-works" aria-labelledby="notice-title">
          <div className="section-intro">
            <span className="section-label">02 / NOTICE</span>
            <h2 id="notice-title">Something new just made an old conversation relevant again.</h2>
            <p>
              Memora is not asking the creator to search every old comment. A new event can be the
              reason an old memory comes back into view.
            </p>
          </div>
          <BrowserWindow chromeLabel="memora / continuity check" title="New event makes an old memory relevant">
            <div className="notice-window">
              <div className="notice-window__timeline">
                <div className="timeline-entry">
                  <span className="data-label">AUG 03 / LIVESTREAM</span>
                  <strong>Alex asks about beginner editing software.</strong>
                  <StateSticker tone="open">OPEN LOOP</StateSticker>
                </div>
                <div className="timeline-entry timeline-entry--current">
                  <span className="data-label">AUG 23 / NEW CONTENT</span>
                  <strong>My Beginner Editing Workflow</strong>
                  <StateSticker tone="ready">NEW EVENT</StateSticker>
                </div>
              </div>
              <div className="notice-window__reason">
                <span className="section-label">WHY THIS MATTERS</span>
                <p className="notice-window__quote">The new video answers the question Alex left behind.</p>
                <SecondaryLink href="/app/follow-up">Open the follow-up shell</SecondaryLink>
              </div>
            </div>
          </BrowserWindow>
        </section>

        <section className="story-section page-section" id="proof" aria-labelledby="reconnect-title">
          <ProofPanel
            eyebrow="03 / RECONNECT"
            title="Follow the thread. Keep the creator in control."
            titleId="reconnect-title"
          >
            <div className="reconnect-grid">
              <div>
                <div className="reconnect-person">
                  <span className="reconnect-person__name">ALEX</span>
                  <span className="data-label">RETURNING VIEWER / 1 OPEN QUESTION</span>
                </div>
                <p className="proof-panel__statement">
                  Your new video answers the question Alex asked during your livestream.
                </p>
                <div className="proof-panel__source">
                  <span className="data-label">SOURCE MEMORY</span>
                  <span>Livestream / AUG 03 / 42:18</span>
                </div>
              </div>
              <div className="reconnect-action">
                <StateSticker tone="ready">FOLLOW-UP READY</StateSticker>
                <strong>Review follow-up with the new video.</strong>
                <PrimaryButton href="/app/follow-up">REVIEW FOLLOW-UP</PrimaryButton>
              </div>
            </div>
          </ProofPanel>
        </section>

        <section className="story-section page-section" aria-labelledby="loop-title">
          <div className="section-intro section-intro--split">
            <div>
              <span className="section-label">04 / RECORD OUTCOME</span>
              <h2 id="loop-title">A follow-up should become part of the memory too.</h2>
            </div>
            <p>
              The thread does not end when the creator acts. It records what happened so the next
              conversation starts with more context.
            </p>
          </div>
          <div className="loop-track" aria-label="Memora relationship memory loop">
            {[
              ["ASKED", "A source moment begins"],
              ["REMEMBERED", "Context stays attached"],
              ["NOTICED", "New content creates a reason"],
              ["FOLLOWED UP", "The creator chooses the next step"],
              ["ANSWERED", "The outcome returns to memory"],
            ].map(([label, detail]) => (
              <div className="loop-track__item" key={label}>
                <span className="loop-track__dot" aria-hidden="true" />
                <span className="section-label">{label}</span>
                <p>{detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="story-section page-section" aria-labelledby="minds-title">
          <BrowserWindow chromeLabel="memora / continuity layer" title="Why Minds matters to Memora">
            <div className="minds-window">
              <div>
                <span className="section-label">WHY MINDS</span>
                <h2 id="minds-title">Continuity needs somewhere to live.</h2>
              </div>
              <div className="minds-window__copy">
                <p>
                  In the finished product, Minds provides the persistent agent memory and
                  continuity layer that can carry audience context across sessions.
                </p>
                <p>
                  Memora makes that memory visible: source evidence, a plain-language reason and
                  a creator-approved next action. This frontend foundation does not connect to
                  Minds yet.
                </p>
                <span className="hand-note">Memory is useful when the creator can see why it returned.</span>
              </div>
            </div>
          </BrowserWindow>
        </section>

        <section className="story-section page-section" aria-labelledby="control-title">
          <div className="control-window">
            <div className="control-window__heading">
              <span className="section-label">CREATOR CONTROL / PRIVACY</span>
              <h2 id="control-title">Memora assists. It does not impersonate you.</h2>
            </div>
            <div className="control-list">
              <div className="control-list__item">
                <span className="control-list__mark" aria-hidden="true">01</span>
                <div>
                  <strong>Public context for the MVP</strong>
                  <p>Only the source moments a creator chooses to bring into the workspace belong in this story.</p>
                </div>
              </div>
              <div className="control-list__item">
                <span className="control-list__mark" aria-hidden="true">02</span>
                <div>
                  <strong>Evidence stays visible</strong>
                  <p>Recommendations keep the original message, date and reason close at hand.</p>
                </div>
              </div>
              <div className="control-list__item">
                <span className="control-list__mark" aria-hidden="true">03</span>
                <div>
                  <strong>External action needs approval</strong>
                  <p>Review, edit, dismiss or save a draft before anything leaves the creator workspace.</p>
                </div>
              </div>
              <div className="control-list__item">
                <span className="control-list__mark" aria-hidden="true">04</span>
                <div>
                  <strong>Memory remains clearable</strong>
                  <p>Future controls will let creators dismiss moments or clear app data without hiding the boundary.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="final-cta page-section" aria-labelledby="final-title">
          <div className="final-cta__mark" aria-hidden="true">MEMORA</div>
          <h2 id="final-title">Keep the next conversation from becoming another forgotten comment.</h2>
          <p>Open the frontend shell and follow the thread from the creator&apos;s desk.</p>
          <PrimaryButton href="/app">OPEN MEMORA</PrimaryButton>
        </section>
      </main>

      <footer className="site-footer">
        <span className="wordmark">
          <span className="wordmark__dot" aria-hidden="true" />
          MEMORA
        </span>
        <span className="data-label">CREATIVE MINDS JAM / P0 FRONTEND FOUNDATION</span>
      </footer>
    </div>
  );
}
