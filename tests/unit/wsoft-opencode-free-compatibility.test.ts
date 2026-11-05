import { test } from "node:test";
import assert from "node:assert/strict";
import { OpencodeExecutor } from "../../open-sse/executors/opencode.ts";
import {
  applyFreeTierRequestContract,
  mergeClientToolsWithObserved,
} from "../../open-sse/executors/opencodeFreeTierContract.ts";
import { isValidOpencodeSessionValue } from "../../open-sse/utils/opencodeHeaders.ts";

type ParameterSchema = {
  type: string;
  properties: Record<string, { type: string }>;
  required: string[];
};
type ChatContract = {
  stream: boolean;
  tool_choice?: string;
  tools: Array<{ function: { name: string; parameters: ParameterSchema } }>;
};
type ResponsesContract = {
  tools: Array<{ name: string; parameters: ParameterSchema }>;
};

const foreignSession = "ses_012345678abcABCDEFGHIJKLMN";
const genuineSession = "ses_012345678ffeABCDEFGHIJKLMN";
const freeModel = "nemotron-3-ultra-free";

test("gated requests use inference, paid and Go keep their original endpoints", () => {
  const zen = new OpencodeExecutor("opencode-zen");
  assert.equal(zen.buildUrl(freeModel, true), "https://opencode.ai/inference/v1/chat/completions");
  assert.equal(zen.buildUrl("gpt-5-nano", true), "https://opencode.ai/zen/v1/chat/completions");
  const go = new OpencodeExecutor("opencode-go");
  assert.equal(go.buildUrl(freeModel, true), "https://opencode.ai/zen/go/v1/chat/completions");
});

test("gated sessions are descending, deterministic, and preserve genuine identities", () => {
  const executor = new OpencodeExecutor("opencode-zen");
  const headers = { "x-opencode-session": foreignSession };
  const first = executor.buildHeaders(null, true, headers, freeModel);
  const second = executor.buildHeaders(null, true, headers, freeModel);
  assert.match(first["x-opencode-session"], /^ses_[0-9a-f]{9}f[c-f][0-9a-f][0-9A-Za-z]{14}$/);
  assert.notEqual(first["x-opencode-session"], foreignSession);
  assert.equal(first["x-opencode-session"], second["x-opencode-session"]);
  assert.equal(
    executor.buildHeaders(null, true, { "x-opencode-session": genuineSession }, freeModel)[
      "x-opencode-session"
    ],
    genuineSession
  );
  assert.match(
    executor.buildHeaders(null, true, {}, freeModel)["x-opencode-session"],
    /^ses_[0-9a-f]{9}f[c-f][0-9a-f][0-9A-Za-z]{14}$/
  );
});

test("paid and Go requests preserve shape-valid foreign sessions", () => {
  for (const [provider, model] of [
    ["opencode-zen", "gpt-5-nano"],
    ["opencode-go", freeModel],
  ]) {
    const executor = new OpencodeExecutor(provider);
    assert.equal(
      executor.buildHeaders(null, true, { "x-opencode-session": foreignSession }, model)[
        "x-opencode-session"
      ],
      foreignSession
    );
  }
});

test("default placeholder is read with the genuine required filePath schema", () => {
  const chat = applyFreeTierRequestContract({ stream: false }, "openai") as ChatContract;
  assert.equal(chat.stream, true);
  assert.equal(chat.tools[0].function.name, "read");
  assert.deepEqual(chat.tools[0].function.parameters, {
    type: "object",
    properties: { filePath: { type: "string" } },
    required: ["filePath"],
  });
  const responses = applyFreeTierRequestContract({}, "openai-responses") as ResponsesContract;
  assert.equal(responses.tools[0].name, "read");
  assert.deepEqual(responses.tools[0].parameters, chat.tools[0].function.parameters);
});

test("observed tools use property-bearing schemas without changing client tools", () => {
  const clientTool = {
    type: "function",
    function: {
      name: "custom",
      parameters: { type: "object", properties: { value: { type: "number" } } },
    },
  };
  const body = { tools: [clientTool], tool_choice: "auto" };
  const result = mergeClientToolsWithObserved(
    body,
    "openai",
    "opencode-zen",
    freeModel,
    undefined,
    ["read", "bash", "glob", "grep"]
  ) as unknown as ChatContract;
  assert.equal(result.tools[0], clientTool);
  assert.equal(result.tool_choice, "auto");
  assert.equal(body.tools.length, 1);
  for (const tool of result.tools.slice(1)) {
    assert.equal(Object.keys(tool.function.parameters.properties).length, 1);
    assert.equal(tool.function.parameters.required.length, 1);
  }
});

test("session counter validation accepts the exact descending counter window", () => {
  for (const suffix of ["fc0", "fc1", "ffe", "fff"]) {
    const session = `ses_012345678${suffix}ABCDEFGHIJKLMN`;
    assert.equal(isValidOpencodeSessionValue(session), session);
  }
  for (const suffix of ["fbf", "000", "abc"]) {
    assert.equal(isValidOpencodeSessionValue(`ses_012345678${suffix}ABCDEFGHIJKLMN`), undefined);
  }
  assert.equal(isValidOpencodeSessionValue(undefined), undefined);
  assert.equal(isValidOpencodeSessionValue("foreign-session"), undefined);
});
