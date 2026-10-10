import assert from "node:assert/strict";
import test from "node:test";
import { claudeProvider } from "../../open-sse/config/providers/registry/claude/index.ts";

test("Claude OAuth registry exposes verified Opus and Sonnet 5.5 IDs without duplicate entries", () => {
  for (const id of ["claude-opus-5-5", "claude-sonnet-5-5"]) {
    const matches = claudeProvider.models.filter((model) => model.id === id);
    assert.equal(matches.length, 1, `${id} must have exactly one registry entry`);
    assert.match(matches[0].name, /Claude (Opus|Sonnet) 5\.5/);
    assert.deepEqual(matches[0].unsupportedParams, ["temperature", "top_p", "top_k"]);
  }
  assert.ok(claudeProvider.models.some((model) => model.id === "claude-opus-5"));
  assert.ok(claudeProvider.models.some((model) => model.id === "claude-sonnet-5"));
});
