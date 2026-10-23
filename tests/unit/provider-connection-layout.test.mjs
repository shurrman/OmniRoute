import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const components = new URL(
  "../../src/app/(dashboard)/dashboard/providers/[id]/components/",
  import.meta.url
);
const connectionRow = readFileSync(new URL("ConnectionRow.tsx", components), "utf8");
const toolbar = readFileSync(new URL("ConnectionsHeaderToolbar.tsx", components), "utf8");

test("connection content, actions and Codex quota pools occupy separate rows", () => {
  assert.match(connectionRow, /group flex flex-col items-stretch gap-3/);
  assert.match(
    connectionRow,
    /flex flex-wrap items-center gap-2 \[&_button\]:shrink-0 \[&_button\]:whitespace-nowrap/
  );
  assert.match(connectionRow, /<CodexAccountDetails pool=\{connection.codexAccountPool\}/);
});

test("provider toolbar wraps controls without squeezing account settings", () => {
  assert.match(toolbar, /mb-4 flex flex-col gap-3"/);
  assert.doesNotMatch(toolbar, /sm:flex-row sm:items-center sm:justify-between/);
  assert.match(
    toolbar,
    /flex flex-wrap items-center gap-2 \[&_button\]:shrink-0 \[&_button\]:whitespace-nowrap/
  );
  assert.match(
    toolbar,
    /inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-sky/
  );
});

test("Russian short toggles use translated labels instead of placeholders", () => {
  const messages = JSON.parse(
    readFileSync(new URL("../../src/i18n/messages/ru.json", import.meta.url), "utf8")
  );
  assert.equal(messages.providers.toggleOnShort, "Вкл.");
  assert.equal(messages.providers.toggleOffShort, "Выкл.");
});
