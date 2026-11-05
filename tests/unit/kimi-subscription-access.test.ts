import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyProviderError,
  PROVIDER_ERROR_TYPES,
} from "../../open-sse/services/errorClassifier.ts";
import { resolveTerminalConnectionStatus } from "../../src/sse/services/authTerminalStatus.ts";

const refusal =
  "Your current subscription does not have access to k3.1-pro-highspeed. Upgrade to higher-tier Kimi Code plans.";

test("Kimi model subscription refusal locks only the model, not the connection", () => {
  const type = classifyProviderError(403, { error: { message: refusal } }, "kimi-coding");
  assert.equal(type, PROVIDER_ERROR_TYPES.MODEL_NOT_FOUND);
  assert.equal(
    resolveTerminalConnectionStatus(403, { permanent: true }, type, "kimi-coding"),
    null
  );
});

test("Kimi genuine account suspension remains terminal", () => {
  assert.equal(
    classifyProviderError(
      403,
      { error: { message: "account_deactivated: this account has been disabled" } },
      "kimi-coding"
    ),
    PROVIDER_ERROR_TYPES.ACCOUNT_DEACTIVATED
  );
});

test("Unknown Kimi forbidden errors are not suppressed", () => {
  assert.equal(
    classifyProviderError(403, "Forbidden", "kimi-coding"),
    PROVIDER_ERROR_TYPES.FORBIDDEN
  );
});

test("Kimi subscription exception does not change other OAuth providers", () => {
  assert.equal(classifyProviderError(403, refusal, "claude"), PROVIDER_ERROR_TYPES.FORBIDDEN);
});
