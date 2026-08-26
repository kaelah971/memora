import assert from "node:assert/strict";
import test from "node:test";

import { buildDiscordAuthorizeUrl, exchangeDiscordOAuthCode } from "../../lib/discord/oauth";
import { selectConnectedChannelIds } from "../../lib/discord/channels";
import { createDiscordOAuthState, isValidDiscordOAuthState } from "../../lib/discord/state";

const oauthConfig = {
  clientId: "client-123",
  clientSecret: "secret-456",
  redirectUri: "http://localhost:3000/api/discord/callback",
};

test("Discord authorize URL requests the read-only bot install scopes and permissions", () => {
  const url = new URL(buildDiscordAuthorizeUrl(oauthConfig, "state-value"));
  assert.equal(url.searchParams.get("client_id"), oauthConfig.clientId);
  assert.equal(url.searchParams.get("redirect_uri"), oauthConfig.redirectUri);
  assert.equal(url.searchParams.get("scope"), "bot applications.commands");
  assert.equal(url.searchParams.get("permissions"), "68608");
  assert.equal(url.searchParams.get("state"), "state-value");
  assert.equal(url.searchParams.get("integration_type"), "0");
});

test("OAuth state is random, single-value, and timing-safe", () => {
  const state = createDiscordOAuthState();
  assert.equal(state.length, 64);
  assert.equal(isValidDiscordOAuthState(state, state), true);
  assert.equal(isValidDiscordOAuthState(state, `${state}x`), false);
  assert.equal(isValidDiscordOAuthState(undefined, state), false);
});

test("OAuth code exchange uses Basic client authentication and does not log token data", async () => {
  const requests: Request[] = [];
  const response = await exchangeDiscordOAuthCode("one-time-code", oauthConfig, async (input, init) => {
    requests.push(new Request(input, init));
    return new Response(JSON.stringify({ access_token: "oauth-token", token_type: "Bearer", guild: { id: "1541889129237848164", name: "Memora" } }), { status: 200 });
  });

  assert.equal(response.access_token, "oauth-token");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].headers.get("authorization")?.startsWith("Basic "), true);
  assert.equal(await requests[0].text(), "grant_type=authorization_code&code=one-time-code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fdiscord%2Fcallback");
});

test("saved channel selection removes duplicates and rejects channels outside the bot-readable set", () => {
  const result = selectConnectedChannelIds(
    ["channel-1", "channel-1", "channel-3", ""],
    [
      { id: "channel-1", name: "questions", type: 0, canRead: true, selected: false },
      { id: "channel-2", name: "announcements", type: 5, canRead: true, selected: false },
    ],
  );
  assert.deepEqual(result.selected, ["channel-1"]);
  assert.deepEqual(result.invalid, ["channel-3"]);
});
