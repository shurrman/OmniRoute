import assert from "node:assert/strict";
import test from "node:test";
import { isCodexAuthenticationFailure } from "@/app/api/usage/[connectionId]/route";

test("recognizes an expired Codex OAuth connection", () => {
  assert.equal(
    isCodexAuthenticationFailure({ provider: "codex", lastErrorType: "unauthorized" }),
    true
  );
  assert.equal(isCodexAuthenticationFailure({ provider: "codex", testStatus: "expired" }), true);
});

test("does not classify Codex quota or other provider errors as auth expiry", () => {
  assert.equal(
    isCodexAuthenticationFailure({ provider: "codex", lastErrorType: "quota_exhausted" }),
    false
  );
  assert.equal(
    isCodexAuthenticationFailure({ provider: "codex", lastErrorType: "model_not_found" }),
    false
  );
  assert.equal(isCodexAuthenticationFailure({ provider: "claude", lastErrorType: "unauthorized" }), false);
});
