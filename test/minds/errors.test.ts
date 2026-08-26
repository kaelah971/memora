import assert from "node:assert/strict";
import test from "node:test";

import { MindsApiError } from "@animocabrands/minds-client-lib";

import { MindsIntegrationError, toMindsErrorInfo } from "../../lib/minds/errors";

test("Minds API diagnostics preserve useful status and request information", () => {
  const diagnostic = toMindsErrorInfo(
    new MindsApiError({
      status: 429,
      code: "RATE_LIMITED",
      message: "Too many requests",
      requestId: "request-123",
    }),
  );

  assert.deepEqual(diagnostic, {
    code: "RATE_LIMITED",
    message: "Too many requests",
    status: 429,
    requestId: "request-123",
  });
});

test("diagnostics redact the Builder key", () => {
  const diagnostic = toMindsErrorInfo(
    new MindsIntegrationError("API", "Request failed for secret-test-key"),
    "secret-test-key",
  );

  assert.equal(diagnostic.message, "Request failed for [REDACTED]");
  assert.equal(diagnostic.message.includes("secret-test-key"), false);
});
