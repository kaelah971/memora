import assert from "node:assert/strict";
import test from "node:test";

import {
  createYouTubeImportRequest,
  getImportButtonState,
  getSafeYouTubeApiError,
  getYouTubeImportSummaryItems,
} from "../../lib/youtube/import-ui";

test("video selection enables importing and importing shows immediate feedback", () => {
  assert.deepEqual(getImportButtonState(null, false), {
    disabled: true,
    label: "IMPORT COMMENTS",
  });
  assert.deepEqual(getImportButtonState("_IjuW9L6C2A", false), {
    disabled: false,
    label: "IMPORT COMMENTS",
  });
  assert.deepEqual(getImportButtonState("_IjuW9L6C2A", true), {
    disabled: true,
    label: "IMPORTING…",
  });
});

test("the import request carries the selected video ID", () => {
  const request = createYouTubeImportRequest("_IjuW9L6C2A");
  assert.equal(request.endpoint, "/api/youtube/import-comments");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body as string), {
    videoId: "_IjuW9L6C2A",
    maxComments: 100,
  });
});

test("already-known imports remain a visible success summary", () => {
  const items = getYouTubeImportSummaryItems({
    videoId: "_IjuW9L6C2A",
    fetched: 2,
    inserted: 0,
    alreadyKnown: 2,
    audienceMembersCreated: 0,
    audienceMembersUpdated: 2,
    sourceCreated: false,
    creatorEventCreated: false,
    pagesFetched: 1,
  });

  assert.deepEqual(items.map((item) => `${item.value} ${item.label}`), [
    "2 fetched",
    "0 new comments added",
    "2 already known",
    "0 audience members created",
    "2 audience members updated",
  ]);
});

test("safe API errors remain visible to the caller", () => {
  assert.equal(getSafeYouTubeApiError({ error: "Reconnect YouTube to continue." }), "Reconnect YouTube to continue.");
  assert.equal(getSafeYouTubeApiError({ code: "api_error" }), "The YouTube request failed.");
});
