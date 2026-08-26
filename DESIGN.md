---
version: alpha
name: Memora
description: A warm scrapbook-meets-desktop-app design system for Memora, where persistent audience memory is visualised as a living conversation thread across messages, moments and creator-approved follow-ups.
colors:
  primary: "#1A1A1A"
  ink: "#1A1A1A"
  notebookCream: "#F8F5EC"
  circleOrange: "#F0714A"
  stickerBlue: "#3D57DB"
  deepGold: "#F1BC3C"
  nearBlackPanel: "#121212"
  mint: "#A9E7C0"
  paleYellow: "#F8E7A3"
  pink: "#F6C3DA"
  lightBlue: "#C7D6FB"
  polaroidWhite: "#FFFFFF"
  trafficRed: "#F2637A"
  trafficYellow: "#F3C04D"
  trafficGreen: "#5FBF6B"
  mutedInk: "#6D6A64"
  softRule: "#DED9CE"
  disabledInk: "#6D6A64"
typography:
  pixel-title:
    fontFamily: "Press Start 2P, VT323, monospace"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 32px
    letterSpacing: "0em"
  statement-headline:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 40px
    letterSpacing: "-0.015em"
  section-label:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 18px
    letterSpacing: "0.035em"
  nav-label:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: "0.015em"
  button-label:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 700
    lineHeight: 18px
    letterSpacing: "0.015em"
  body-handwritten:
    fontFamily: "Gochi Hand, Kalam, Caveat, cursive"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 28px
    letterSpacing: "0em"
  annotation:
    fontFamily: "Gochi Hand, Kalam, Caveat, cursive"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 18px
    letterSpacing: "0em"
  ui-body:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 23px
    letterSpacing: "0em"
  data-label:
    fontFamily: "IBM Plex Mono, SFMono-Regular, Consolas, monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 16px
    letterSpacing: "0.02em"
  stat-number:
    fontFamily: "General Sans, Inter Tight, Inter, sans-serif"
    fontSize: 28px
    fontWeight: 800
    lineHeight: 30px
    letterSpacing: "-0.02em"
rounded:
  polaroid: "4px"
  window: "10px"
  field: "10px"
  chip: "16px"
  pill: "9999px"
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
components:
  browser-window:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.window}"
    padding: 0px
  browser-chrome:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.window}"
    height: 36px
  primary-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.polaroidWhite}"
    typography: "{typography.button-label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 44px
  primary-button-hover:
    backgroundColor: "{colors.nearBlackPanel}"
    textColor: "{colors.polaroidWhite}"
    typography: "{typography.button-label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 44px
  secondary-link:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.ink}"
    typography: "{typography.button-label}"
    rounded: "0px"
    padding: 4px 0px
  memory-card:
    backgroundColor: "{colors.polaroidWhite}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: 16px
  source-fragment:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: 16px
  memory-sticker:
    backgroundColor: "{colors.lightBlue}"
    textColor: "{colors.ink}"
    typography: "{typography.section-label}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  open-loop-sticker:
    backgroundColor: "{colors.paleYellow}"
    textColor: "{colors.ink}"
    typography: "{typography.section-label}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  follow-up-sticker:
    backgroundColor: "{colors.mint}"
    textColor: "{colors.ink}"
    typography: "{typography.section-label}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  memory-thread:
    backgroundColor: "{colors.circleOrange}"
    textColor: "{colors.ink}"
    rounded: "0px"
    height: 3px
  active-memory-sticker:
    backgroundColor: "{colors.stickerBlue}"
    textColor: "{colors.polaroidWhite}"
    typography: "{typography.section-label}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  follow-up-panel:
    backgroundColor: "{colors.deepGold}"
    textColor: "{colors.ink}"
    rounded: "{rounded.window}"
    padding: 24px
  human-note:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: 16px
  chrome-dot-red:
    backgroundColor: "{colors.trafficRed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: 8px
  chrome-dot-yellow:
    backgroundColor: "{colors.trafficYellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: 8px
  chrome-dot-green:
    backgroundColor: "{colors.trafficGreen}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: 8px
  secondary-label:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.mutedInk}"
    typography: "{typography.data-label}"
    rounded: "0px"
    padding: 0px
  rule:
    backgroundColor: "{colors.softRule}"
    textColor: "{colors.ink}"
    rounded: "0px"
    height: 1px
  disabled-label:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.disabledInk}"
    typography: "{typography.nav-label}"
    rounded: "0px"
    padding: 0px
  proof-panel:
    backgroundColor: "{colors.nearBlackPanel}"
    textColor: "{colors.polaroidWhite}"
    rounded: "{rounded.window}"
    padding: 24px
  input-field:
    backgroundColor: "{colors.notebookCream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: 16px
---

# Memora Design System

## Overview

### Recommended territory: The Living Conversation Thread

Memora keeps the reference system’s scrapbook-meets-desktop-app substrate, but replaces the portfolio meaning with a product-specific visual world: **important audience moments collected, connected and carried forward**.

The page should feel like a creator’s working desk where meaningful conversations are kept in view—not like a corporate CRM, an engagement casino or a generic AI dashboard.

### The core visual asset: Memory Thread

The Memory Thread is a repeatable, hand-drawn visual path that connects:

```text
SOURCE MESSAGE → REMEMBERED CONTEXT → NEW CONTENT → FOLLOW-UP → OUTCOME
```

It is built from small message fragments, source labels, date notes, a thin orange thread and one clear next action. It has a functional job: it proves why Memora made a recommendation.

Use the Memory Thread in:

- the landing-page hero;
- an Audience Memory Card;
- the Reply Priority Queue;
- the Follow-Up Lab;
- the Minds Outbox;
- the judge-facing Proof page;
- shareable “you asked, I remembered” content.

### Preserve / replace / reinterpret

| Reference layer | Decision for Memora |
|---|---|
| Notebook Cream background and ruled paper | **Preserve exactly.** It is the physical desk surface for the memory system. |
| Scrapbook-meets-desktop-app atmosphere | **Preserve.** It makes audience memory feel personal rather than bureaucratic. |
| Browser-window frames, traffic lights and pill nav | **Preserve.** They become the visible containers for memory, queue, follow-up and proof workflows. |
| Press Start 2P, General Sans and Gochi Hand | **Preserve exactly.** Each still has a strict role. |
| Sticker pills, thin ink borders and small hard shadows | **Preserve.** They become states, source labels and action chips. |
| Polaroid cards and tape | **Reinterpret.** They hold source-message fragments, creator notes and memorable audience moments—not arbitrary profile photography. |
| Orange hand-drawn highlight | **Reinterpret.** It marks the main memory idea or the one next action, never decoration everywhere. |
| Diagonal project blocks and PROJECT 0X flags | **Replace.** They become Memory Moments or Proof Chapters with labels such as `MOMENT 01` and `THREAD 01`. |
| Portfolio profile photo rings and “open to work” status | **Replace.** Use a creator context marker, connected-source dot or memory-state marker. |
| Contact-me language and case-study navigation | **Replace.** Use `MEMORY`, `QUEUE`, `FOLLOW UP`, `OUTBOX` and `PROOF`. |
| Skill badges and portfolio stats | **Replace.** Use source types, unresolved-loop counts and approved follow-up states. |

### Product rule

> **Every decorative object must either preserve a conversation, explain a recommendation or make the next creator action clearer.**

### What this system must not become

Do not turn the system into:

- a gamified fan leaderboard;
- a surveillance dashboard;
- a grid of meaningless AI cards;
- a pastel CRM with human names reduced to scores;
- a generic creator economy gradient;
- a noisy collage where the source message and next action disappear.

The reference is expressive. Memora must remain legible.

## Colors

### Primary substrate

- **Ink — `#1A1A1A`**: all primary text, borders, browser chrome and high-emphasis actions.
- **Notebook Cream — `#F8F5EC`**: global background, browser surfaces, input fields and the ruled-paper canvas.
- **Polaroid White — `#FFFFFF`**: message cards, source fragments and lifted paper surfaces.

The background colour is intentionally retained from the reference system. It creates warmth and gives the dark ink, pastel states and orange thread enough contrast to feel tactile rather than sterile.

### Memora brand accents

- **Circle Orange — `#F0714A`**: Memory Thread, one-off circled highlight, unresolved emphasis and creator annotation. Do not use it as small body text on cream; it is a stroke and attention device.
- **Sticker Blue — `#3D57DB`**: selected memory, connected context, active source and primary navigation state.
- **Deep Gold — `#F1BC3C`**: Follow-Up Lab panels, new-content triggers and “this is the moment to reconnect” surfaces.
- **Near-Black Panel — `#121212`**: Proof page, Minds Outbox confirmation and high-contrast evidence surfaces.

### Pastel state set

- **Mint — `#A9E7C0`**: creator-approved or completed follow-up.
- **Pale Yellow — `#F8E7A3`**: open loop, unanswered question or needs review.
- **Pink — `#F6C3DA`**: thoughtful feedback, human note or emotionally meaningful message.
- **Light Blue — `#C7D6FB`**: remembered context, source connection or synced memory.

Pastel colours are state labels, not decoration. Never communicate a critical state by colour alone; pair each with text such as `OPEN`, `APPROVED`, `COMPLETED` or `SOURCE MEMORY`.

### Utility neutrals

- **Muted Ink — `#6D6A64`**: secondary labels and supporting copy.
- **Soft Rule — `#DED9CE`**: ruled paper lines, separators and non-interactive dividers.
- **Disabled Ink — `#A7A39B`**: disabled controls only; do not use for required information.

### Traffic-light chrome

- **Red — `#F2637A`**
- **Yellow — `#F3C04D`**
- **Green — `#5FBF6B`**

These dots are browser-window chrome, not product status indicators. Do not use them to imply moderation, safety or publishing state.

### Contrast and accessibility

- Use Ink on Notebook Cream for primary text and controls.
- Use Ink on all pastel surfaces.
- Use white text only on Near-Black Panel and Ink buttons.
- Do not use Circle Orange as essential text or as the sole indicator of state.
- Keep the hand-drawn thread supplemental to an explicit label and timeline.
- Provide visible focus states with an Ink outline plus a 2px offset.
- Preserve 44px minimum touch targets for buttons and navigation.

## Typography

### Font roles

**Press Start 2P** remains a display instrument, not a reading font. Use it for short, all-caps section titles such as:

```text
MEMORA
MEMORY
QUEUE
FOLLOW UP
OUTBOX
PROOF
```

Fallback: `VT323`, monospace.

**General Sans** is the structural voice. Use it for:

- statement headlines;
- navigation;
- buttons;
- source labels;
- state names;
- timestamps when legibility matters;
- empty states and explanations.

Fallback: `Inter Tight`, `Inter`, sans-serif.

**Gochi Hand** is the human annotation layer. Use it for:

- creator notes;
- body copy in the landing-page narrative;
- small marginalia;
- source-message quotations when the quote is short;
- helper copy that benefits from a personal tone.

Fallback: `Kalam`, `Caveat`, cursive.

**IBM Plex Mono** is the evidence layer. Use it for:

- source IDs;
- timestamps;
- import counts;
- memory references;
- Minds post IDs;
- proof metadata.

Fallback: `SFMono-Regular`, `Consolas`, monospace.

### Hierarchy

| Role | Font | Size | Weight | Line height | Use |
|---|---|---:|---:|---:|---|
| Pixel Title | Press Start 2P | 28px | 400 | 32px | Short all-caps page and window titles |
| Statement Headline | General Sans | 32px | 700 | 40px | Hero and product promise |
| Section Label | General Sans | 13px | 700 | 18px | State chips and compact labels |
| Navigation | General Sans | 13px | 600 | 18px | Window tabs and primary nav |
| Button | General Sans | 13px | 700 | 18px | Actions and CTAs |
| UI Body | General Sans | 15px | 500 | 23px | Product descriptions and explanations |
| Body Handwritten | Gochi Hand | 18px | 400 | 28px | Brand narrative and creator voice |
| Annotation | Gochi Hand | 14px | 400 | 18px | Marginalia and short notes |
| Data Label | IBM Plex Mono | 12px | 500 | 16px | Timestamps, IDs and proof metadata |
| Stat Number | General Sans | 28px | 800 | 30px | Counts such as open loops and memories |

### Rules

- Press Start 2P is limited to one-to-three-word all-caps labels.
- Never set a full sentence in Press Start 2P.
- General Sans carries product comprehension and interaction.
- Gochi Hand adds a human voice but never carries essential instructions alone.
- IBM Plex Mono makes source and proof data feel inspectable.
- Annotations may rotate between `-2deg` and `3deg`, but do not rotate status labels, controls or form instructions.
- Use sentence case for explanations and explicit uppercase only for short states.

## Layout

### Overall composition

Retain the reference system’s narrow, centred, single-column read:

- maximum content width: `900px`;
- generous cream margins on wide screens;
- browser-window frames for major surfaces;
- dense details layered over a calm vertical rhythm;
- no wide analytics dashboard as the default landing experience.

Memora’s density should come from connected evidence—not from stacking endless cards.

### Spacing

Base unit: `4px`.

```text
4px   tape and icon offsets
8px   chip padding and small gaps
12px  compact labels and control gaps
16px  card padding and field padding
24px  section internals and evidence groups
32px  major card groups
48px  screen sub-sections
64px  window-to-window breathing room
96px  landing-page section rhythm
```

### Page structure

A typical Memora page follows:

```text
WINDOW CHROME
  └─ WINDOW TAB / CONTEXT
       └─ ONE CLEAR HEADLINE
            └─ SOURCE OR MEMORY EVIDENCE
                 └─ NEXT CREATOR ACTION
```

For the dashboard:

1. current memory state;
2. one recommended action;
3. source messages and explanation;
4. secondary counts and history.

Do not lead with a decorative collage before telling the creator what needs attention.

### Navigation

The primary navigation remains a single pill bar inside the browser-window world:

```text
MEMORA · MEMORY · QUEUE · FOLLOW UP · OUTBOX · PROOF
```

Active tab uses a pastel fill, preferably Sticker Blue for memory surfaces or Deep Gold for follow-up surfaces. The active state must also include text or an icon change, not colour alone.

### Responsive behaviour

- `375px–599px`: tabs become icon-plus-tooltip or icon-only; source fragments stack; Memory Thread becomes vertical; evidence remains above the action.
- `600px–1023px`: retain the single column and tighten frame padding.
- `1024px–1439px`: full 900px system.
- `1440px+`: preserve the 900px column and allow only additional cream margin.
- Below `768px`, all Memory Thread nodes stack vertically in chronological order.
- Below `480px`, reduce decorative tape and rotation before reducing type size.
- Never hide the current state or primary action in a horizontal overflow region.

## Elevation & Depth

Depth remains tactile rather than architectural.

| Level | Treatment | Memora use |
|---|---|---|
| Flat | No shadow | Browser frames, paper background and structural text |
| Sticker | `2px 2px 0px rgba(26,26,26,0.15–0.2)` | State pills, source labels, buttons and stat chips |
| Photo Lift | Soft low-opacity blurred shadow | Source-message polaroids and creator memory snapshots |
| Sketch | Hand-jittered stroke, no shadow | Circle Orange Memory Thread and one-off headline highlight |
| Proof | Near-Black surface, no glow | Evidence and Minds publishing result |

Do not use glassmorphism, glow, floating 3D objects or soft SaaS shadows. The system should feel like paper objects placed on a desk.

## Shapes

### Border radius

- `4px`: polaroid and source snapshot corners;
- `10px`: browser frames, memory cards, forms and evidence fields;
- `16px`: stat callouts;
- `9999px`: nav bar, buttons and status pills.

### Signature shapes

#### Browser Window Frame

- `1.5px` Ink border;
- top corners `10px`, bottom corners square;
- 36px chrome bar;
- three 8px traffic-light dots;
- pill tabs inside the content header;
- retained across landing, memory, queue, follow-up and proof.

#### Memory Thread

- hand-drawn or lightly irregular Circle Orange line;
- not a progress bar;
- each node carries explicit source, date and state;
- line can branch once when one new video answers multiple old questions;
- must work in monochrome as a thin rule plus labels.

#### Circled Highlight

- `3px` hand-jittered Circle Orange border;
- transparent fill;
- one short Press Start 2P title inside;
- at most one per screen;
- recommended uses: `MEMORA` in the landing hero and `REMEMBER THE RELATIONSHIP` as a short highlight label.

#### Polaroid Source Snapshot

- white surface;
- `10px 10px 28px 10px` padding;
- 4px corners;
- slight `-3deg` to `4deg` rotation;
- one or two semi-transparent tape strips;
- caption in Gochi Hand;
- content is a real or demo source message, not stock imagery.

## Components

### Primary button

Use for one main action per surface:

- background: Ink;
- text: white;
- 44px height;
- 12px 24px padding;
- pill radius;
- General Sans 13px, 700;
- `2px 2px 0px rgba(26,26,26,0.2)` hard shadow;
- hover shifts upward 1px and grows shadow to `3px 3px 0px`;
- focus: 2px Ink outline with 2px offset.

Recommended labels:

- `Review follow-up`;
- `Approve draft`;
- `Open memory`;
- `Import conversations`;
- `See proof`.

Avoid vague labels such as `Get started` when the action is known.

### Secondary link

- transparent background;
- Ink text;
- General Sans 13px, 700;
- underline or arrow suffix;
- labels such as `View source →`, `Open thread →` and `See why →`.

### Browser Window Frame

The signature container wraps nearly every major section. The chrome establishes continuity between the landing page and the product.

Suggested tab examples:

- `MEMORY`;
- `QUEUE`;
- `FOLLOW UP`;
- `OUTBOX`;
- `PROOF`.

### Audience Memory Card

This is the main product card, retaining the reference’s outlined, tactile feel but replacing portfolio content with conversation context.

Structure:

```text
MAYA                                      REMEMBERED
commented on 3 recent videos             3 SOURCE MOMENTS

“Your tutorials are helpful, but I still get confused during setup.”

TOPICS       setup · beginner workflow
OPEN LOOP    answered by your latest video
NEXT ACTION  review follow-up

[SEE WHY →]                         [REVIEW]
```

Treatment:

- Polaroid White surface;
- 1.5px Ink border;
- 10px radius;
- 16px padding;
- small hard sticker shadow only when the card is actionable;
- one pastel state sticker;
- source metadata in IBM Plex Mono;
- no opaque score as the primary visual.

### Source Fragment

A source fragment preserves the original message and its context:

- Notebook Cream surface;
- Ink border;
- timestamp and platform in IBM Plex Mono;
- quote in Gochi Hand only when short;
- source link in General Sans;
- optional tape detail if used as a polaroid;
- never alter the quote in a way that changes meaning.

### Reply Priority Item

Use the visual hierarchy:

1. viewer and message;
2. explicit reason it matters;
3. source memory;
4. suggested action;
5. approve/dismiss/complete controls.

Do not make a numeric priority score larger than the actual human context.

### Open Loop Sticker

- Pale Yellow background;
- Ink text and border;
- label `OPEN LOOP` or `NEEDS REVIEW`;
- hard sticker shadow;
- always accompanied by the unresolved question itself.

### Follow-Up Sticker

- Mint background for approved or completed action;
- label `APPROVED`, `COMPLETED` or `READY`;
- do not use mint to imply the message was actually sent unless a real action result exists.

### Minds Outbox

Use the Near-Black Panel for a serious but warm proof surface:

- white text;
- source-memory line in Light Blue;
- draft text on Polaroid White or Notebook Cream;
- explicit mode label: `PUBLISHED`, `DRAFT CREATED`, `COPY READY` or `COMPOSER OPENED`;
- returned URL or post ID in IBM Plex Mono;
- no claim of publication without returned proof.

### Memory Moment Block

This replaces the reference system’s portfolio project block.

- diagonal-cut top edge;
- alternate Near-Black and Deep Gold backgrounds;
- corner flag reads `MOMENT 01`, `THREAD 02` or `PROOF 03`;
- one source quote, one creator outcome and one next action;
- image area is a taped source snapshot or hand-drawn conversation fragment, never a generic dashboard mockup;
- white text on Near-Black; Ink text on Deep Gold.

### Stat Callout Chip

Use sparingly for useful counts:

- `8 OPEN LOOPS`;
- `3 RETURNING VIEWERS`;
- `12 MEMORIES UPDATED`;
- `1 FOLLOW-UP READY`.

Treatment:

- pastel fill;
- 1.5px Ink border;
- 16px radius;
- 20px 24px padding;
- Stat Number in General Sans;
- caption in Gochi Hand;
- never present loyalty or intent as a definitive judgement about a person.

### Input and text area

For creator-entered topics and edited drafts:

- Notebook Cream background;
- 1.5px Ink border;
- 10px radius;
- 16px padding;
- General Sans for inputs that affect system state;
- Gochi Hand may be used for a creator draft preview, not for labels or error messages;
- placeholder: muted Ink at reduced opacity;
- visible focus outline;
- error state includes plain-language text and recovery action.

### Empty state

Keep the personal tone but make the action clear:

> Your audience memory starts with a conversation. Import comments or livestream chat to see what is worth remembering.

Use a small taped source fragment, not a decorative illustration with no product evidence.

### Loading and error states

- Loading: show a simple Memory Thread with `REMEMBERING…` and avoid fake percentage progress.
- Error: explain whether import, memory retrieval or publishing failed.
- Retry action uses the primary button style.
- Preserve drafts and source data when a reasoning or publishing call fails.

## Motion

Motion should clarify continuity, not simulate intelligence.

- Memory Thread nodes may draw in sequentially once on first view.
- New source fragments may slide into a thread by 8–12px.
- Approval may settle a sticker into place with a 150ms ease-out.
- Do not animate scores, faces, messages or “thinking” loops indefinitely.
- Respect `prefers-reduced-motion`: remove drawing, rotation and slide effects while preserving the thread and state labels.
- Never make a critical status depend on animation.

## Imagery and illustration

### Use

- real or realistic source-message fragments;
- creator notes and annotations;
- taped snapshots of conversation context;
- simple hand-drawn arrows, circles and thread paths;
- cropped creator workspace details only when they support the relationship story.

### Avoid

- stock creator teams pointing at screens;
- glowing brains;
- robot mascots;
- floating chat bubbles with no source;
- generic AI sparkles;
- social-media growth arrows;
- fan leaderboards;
- faces or avatars presented as data decoration;
- a wall of colourful cards that makes people look like records.

## Landing-page expression

### Hero

Use one browser window on Notebook Cream.

```text
MEMORA

REMEMBER THE RELATIONSHIP.

Memora helps creators remember the people, questions and promises behind their audience—then shows who to follow up with next.

[SEE WHAT YOUR AUDIENCE REMEMBERS]
```

The Memory Thread should begin with a small livestream source fragment and end at a creator-approved follow-up. The hero must explain the product before the scrapbook decoration becomes visible.

### Page flow

1. Hero: the promise and first thread.
2. The problem: messages disappear when platforms treat them as isolated events.
3. Memory: show a real source fragment becoming context.
4. Priority: show why a viewer should be answered first.
5. Follow-up: show a new video reopening an old conversation.
6. Minds Outbox: show creator approval and publishing/draft proof.
7. Privacy: public-only MVP, source visibility, delete and dismiss controls.
8. CTA: `Import your conversations` or `See the proof thread`.

## Do's and Don'ts

### Do

- Keep the Notebook Cream background and ruled-paper texture.
- Frame major surfaces as browser windows with traffic-light chrome.
- Keep Press Start 2P limited to short all-caps labels.
- Use General Sans for comprehension and controls.
- Use Gochi Hand for personal notes, quotes and marginalia.
- Use real source messages as the visual evidence.
- Make the Memory Thread a repeated functional asset.
- Keep one circled highlight per screen at most.
- Give every recommendation a source and explanation.
- Preserve the creator’s agency at every external action.
- Use stickers and hard shadows as tactile state markers.
- Keep the content column near 900px and single-column.
- Make mobile reorder information rather than merely shrink it.

### Don't

- Do not copy portfolio labels such as `PROJECT 01`, `ABOUT ME` or `CONTACT ME` into the product without reinterpretation.
- Do not use the reference’s profile-photo rings as generic fan avatars.
- Do not turn every viewer into a coloured badge or score.
- Do not use the pixel font for long copy.
- Do not use the orange thread as a decorative squiggle disconnected from source evidence.
- Do not use pastel colour as the only state indicator.
- Do not claim a post was published without a real returned URL or ID.
- Do not use a generic AI dashboard layout underneath the scrapbook styling.
- Do not make memory feel like surveillance.
- Do not widen the main column until the product becomes an analytics grid.
- Do not add gradients, glassmorphism, neon glow or crypto-style AI imagery.
- Do not let decorative rotation compromise reading order, keyboard focus or touch targets.

## Responsive checklist

- All actions remain at least `44px × 44px`.
- Browser chrome remains visible but can compress to dots and short labels.
- Memory Thread becomes a vertical sequence on mobile.
- Source quote, explanation and next action remain in that order.
- Polaroid rotation is reduced when it interferes with readability.
- Diagonal Memory Moment blocks stack text before source imagery below `768px`.
- Navigation labels disappear before the product’s current state disappears.
- No horizontal scrolling is required to understand a recommendation.

## Agent prompt guide

1. Preserve Notebook Cream `#F8F5EC`, Ink `#1A1A1A`, the ruled-paper texture and the browser-window frame.
2. Preserve Press Start 2P, General Sans and Gochi Hand with their strict role separation.
3. Use the Memory Thread as the product-specific recurring asset: source message → memory → new content → follow-up → outcome.
4. Replace portfolio project blocks with Memory Moment or Proof Chapter blocks.
5. Use polaroids for source-message fragments and creator notes, not arbitrary stock photography.
6. Use pastel stickers for explicit states such as `OPEN LOOP`, `REMEMBERED`, `READY` and `COMPLETED`.
7. Give every recommendation a visible source message and a plain-language reason.
8. Keep the visual world tactile and personal, but keep product state, evidence and next action structurally dominant.
9. Use Near-Black Panel for proof and Minds Outbox surfaces; never fake publishing success.
10. Never introduce generic AI gradients, robot imagery, leaderboards, floating chat bubbles or decorative cards without a product job.
11. Keep one hand-drawn circled highlight per screen at most.
12. Respect reduced motion, keyboard navigation, visible focus and colour-independent status communication.

## Implementation priority

### Required

- Notebook Cream ruled-paper background;
- browser-window frame and chrome;
- exact three-font role system;
- Memory Thread;
- Audience Memory Card;
- source-message fragment;
- Reply Priority item;
- Follow-Up Lab state treatment;
- Minds Outbox proof states;
- mobile stacking and accessible focus.

### Optional enhancement

- taped creator-note polaroids;
- diagonal Memory Moment blocks;
- subtle hand-drawn dividers;
- shareable “you asked, I remembered” cards;
- decorative sticker icons after the core evidence hierarchy is stable.

## Final visual recommendation

Keep the reference system’s warmth, craft and paper-object behaviour. Change the meaning completely:

> **Memora is not a portfolio laid out on a desk. It is a creator’s living conversation desk—where important audience moments stay visible long enough to become thoughtful follow-up.**
