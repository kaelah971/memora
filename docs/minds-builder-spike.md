# Minds Builder API Spike

P0.5 validates the real Minds Builder API dependency without adding a database or a product memory pipeline.

## Requirements

- Node.js 22 or newer. The repository declares `engines.node >=22` because `@animocabrands/minds-client-lib` requires it.
- A Builder API key from the [Minds Builder console](https://build.hellominds.ai/console).
- A Mind created or available under that Builder account.

Create a local `.env.local` or set process environment variables. These values are server-side only:

```text
MINDS_BUILDER_API_KEY=
MEMORA_MIND_ID=
MEMORA_MIND_ALIAS=memora-main
```

`MEMORA_MIND_ID` is intentionally required for runtime messaging. The app never silently selects the first Mind. The alias defaults to `memora-main` when omitted.

## Find A Mind

Run discovery after setting `MINDS_BUILDER_API_KEY`:

```bash
npm run minds:discover
```

Discovery prints each Mind ID, name, model, species, and enabled status. It never prints the API key. Set the intended ID explicitly as `MEMORA_MIND_ID`.

## Run The Spike

With all three variables configured, run:

```bash
npm run minds:spike
```

The script generates a unique `memora-spike-${Date.now()}` run ID and includes it in both fixture messages, event IDs, and source IDs so repeated runs are not treated as duplicate fixtures. It gets the configured Mind, ensures `MEMORA_MIND_ALIAS`, sends the structured livestream event, and polls conversation history every 5 seconds for a real reply for up to 180 seconds by default. It creates a new client instance, sends the new-content event through the same alias, polls history again, and evaluates continuity conservatively. Set `MINDS_REPLY_TIMEOUT_MS` to a larger millisecond value when the Builder service is under load.

## Connectivity Ping

Run the isolated natural-language probe before the full continuity spike:

```bash
npm run minds:ping
```

The ping ensures the `memora-ping` alias is bound to `MEMORA_MIND_ID`, sends exactly `Reply with exactly: PONG`, and polls history every 5 seconds for up to 180 seconds. It prints the safe send result, message count, role, timestamp, and fingerprint for each poll. It never prints the Builder API key or other credentials.

The successful report must show:

- both real Mind responses;
- the same alias and conversation ID;
- both event markers recorded in history;
- a second response that references the earlier viewer/context and explains why the new content creates a follow-up opportunity;
- `status: verified`.

The script exits nonzero for missing configuration, API errors, timeouts without a history reply, malformed/empty replies, or an unverified continuity result. A timeout preserves the last polled history in the proof output.

## Internal Proof Screen

In development, `/app/proof/minds-spike` provides a small proof surface that invokes the same server-only service. It shows configuration status without the key, Mind/alias connection details, both responses, history evidence, diagnostics, and the continuity verdict. The route is disabled outside development; use the CLI for a live local proof.

## API Boundary

The integration uses only `@animocabrands/minds-client-lib` messaging and history methods: `createMindsClient`, `getMind`, `ensureConversation`, `getConversation`, `sendMessage`, `getHistory`, and history fingerprints. Memora uses explicit history polling rather than relying on the SDK's SSE-first `waitForReply` path.

The current public Builder API surface does not expose direct arbitrary memory CRUD. Memora communicates structured audience and creator events through the persistent conversation and verifies continuity from later replies plus history. No `storeMemory`, `searchMemory`, or scheduled-task fallback is implemented.

## Limitations

- The proof result is request-scoped and is not stored in Supabase or a local database.
- Semantic verification is deliberately conservative and deterministic; a real Mind reply can be returned while the verdict remains `not-verified`.
- The debug route has no authentication because authentication is a later milestone; it is development-only and must not be enabled as a production workflow.
