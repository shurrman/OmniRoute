import test from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";

const { createStreamController } = await import("../../open-sse/utils/streamHandler.ts");
const { resetDbInstance } = await import("../../src/lib/db/core.ts");
test.after(() => resetDbInstance());

test("dispose releases only the client subscription and is idempotent", () => {
  const client = new AbortController();
  let callbacks = 0;
  const controller = createStreamController({
    clientAbortSignal: client.signal,
    onDisconnect: () => {
      callbacks++;
    },
    onError: () => {
      callbacks++;
    },
  });
  assert.equal(getEventListeners(client.signal, "abort").length, 1);
  controller.dispose();
  controller.dispose();
  assert.equal(getEventListeners(client.signal, "abort").length, 0);
  assert.equal(controller.signal.aborted, false);
  assert.equal(callbacks, 0);
  client.abort();
  assert.equal(controller.signal.aborted, false);
  assert.equal(callbacks, 0);
});

test(
  "dispose makes captured request bodies collectible while the client stays alive",
  {
    skip: typeof globalThis.gc !== "function",
  },
  async () => {
    const client = new AbortController();
    function createCapturedRequest(dispose: boolean) {
      const body = { payload: Buffer.alloc(1024 * 1024) };
      const reference = new WeakRef(body);
      const controller = createStreamController({
        clientAbortSignal: AbortSignal.any([client.signal]),
        onError: () => {
          assert.ok(body.payload.length);
        },
      });
      if (dispose) controller.dispose();
      return reference;
    }
    const retainedControls = Array.from({ length: 32 }, () => createCapturedRequest(false));
    const references = Array.from({ length: 32 }, () => createCapturedRequest(true));
    for (let attempt = 0; attempt < 10; attempt++) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      globalThis.gc?.();
    }
    assert.equal(references.filter((reference) => reference.deref()).length, 0);
    assert.equal(retainedControls.filter((reference) => reference.deref()).length, 32);
    assert.equal(getEventListeners(client.signal, "abort").length, 0);
    assert.equal(client.signal.aborted, false);
    client.abort();
  }
);
