import assert from "node:assert/strict";
import test from "node:test";
import { deriveTokenStatus } from "@/app/api/usage/quota/route";

test("marks a Codex OAuth authentication failure as expired", () => {
  assert.equal(
    deriveTokenStatus({ provider: "codex", lastErrorType: "unauthorized", errorCode: 401 }),
    "expired"
  );
});

test("does not turn Codex quota or model failures into expired auth", () => {
  assert.equal(
    deriveTokenStatus({ provider: "codex", lastErrorType: "quota_exhausted", errorCode: 429 }),
    "valid"
  );
  assert.equal(
    deriveTokenStatus({ provider: "codex", lastErrorType: "model_not_found", errorCode: 401 }),
    "valid"
  );
});
