import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";

const { handleChatCore } = await import("../../open-sse/handlers/chatCore.ts");
const { resetDbInstance } = await import("../../src/lib/db/core.ts");
const { waitForCallLogSaves } = await import("../../src/lib/usage/callLogs.ts");
const originalFetch = globalThis.fetch;

test.after(async () => {
  globalThis.fetch = originalFetch;
  await waitForCallLogSaves(5000);
  resetDbInstance();
});

for (const outcome of ["success", "error", "stream"] as const) {
  test(`chatCore releases client abort subscription: ${outcome}`, async () => {
    const client = new AbortController();
    const streaming = outcome === "stream";
    let finishStream = () => {};
    const completion = {
      id: `cleanup-${outcome}`,
      object: streaming ? "chat.completion.chunk" : "chat.completion",
      model: "gpt-4o-mini",
      choices: [
        {
          index: 0,
          ...(streaming
            ? { delta: { role: "assistant", content: "OK" } }
            : { message: { role: "assistant", content: "OK" } }),
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    };
    globalThis.fetch = async () =>
      outcome === "error"
        ? new Response(JSON.stringify({ error: { message: "test failure" } }), { status: 400 })
        : new Response(
            streaming
              ? new ReadableStream({
                  start(controller) {
                    controller.enqueue(
                      new TextEncoder().encode(`data: ${JSON.stringify(completion)}\n\n`)
                    );
                    finishStream = () => {
                      controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
                      controller.close();
                      finishStream = () => {};
                    };
                  },
                })
              : JSON.stringify(completion),
            {
              headers: { "Content-Type": streaming ? "text/event-stream" : "application/json" },
            }
          );
    const body = {
      model: "gpt-4o-mini",
      stream: streaming,
      messages: [{ role: "user", content: `cleanup ${outcome}` }],
    };
    try {
      const result = await handleChatCore({
        body,
        modelInfo: { provider: "openai", model: "gpt-4o-mini" },
        credentials: { apiKey: "sk-test", providerSpecificData: {} },
        apiKeyInfo: { id: "abort-cleanup-test", cacheDefaultMode: "bypass" },
        log: { debug() {}, info() {}, warn() {}, error() {} },
        clientRawRequest: {
          endpoint: "/v1/chat/completions",
          body,
          headers: new Headers({ accept: streaming ? "text/event-stream" : "application/json" }),
          signal: client.signal,
        },
      } as Parameters<typeof handleChatCore>[0]);
      assert.equal(result.success, outcome !== "error");
      if (streaming) {
        assert.ok(getEventListeners(client.signal, "abort").length > 0);
        finishStream();
      } else {
        assert.equal(
          getEventListeners(client.signal, "abort").length,
          0,
          "completed handler must not retain its request through the client signal"
        );
      }
      await result.response.text();
      assert.equal(getEventListeners(client.signal, "abort").length, 0);
    } finally {
      client.abort();
      globalThis.fetch = originalFetch;
    }
  });
}
