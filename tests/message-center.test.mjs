import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the API-backed Message Center workflow", async () => {
  const [page, workspace, api, gateway, navigation] = await Promise.all([
    readFile(new URL("app/staff/message-center/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/message-center-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/message-center-api.ts", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
  ]);

  assert.match(page, /initialPage="message-center"/);
  assert.match(navigation, /\/staff\/message-center/);
  for (const action of ["listMessages", "searchMessageCustomers", "updateMessage", "setMessageArchived", "convertMessageToBrochure"]) assert.match(workspace, new RegExp(action));
  for (const label of ["Inbox", "Archive", "Find customer", "Convert to brochure", "Assigned staff"]) assert.match(workspace, new RegExp(label, "i"));
  assert.match(api, /\/message_center\/\$\{id\}\/brochure/);
  assert.match(gateway, /handleFixtureMessages/);
  assert.doesNotMatch(`${workspace}\n${api}\n${gateway}`, /localStorage|sessionStorage/);
});

test("keeps archive reversible and permanent deletion out of the UI", async () => {
  const [workspace, contract] = await Promise.all([
    readFile(new URL("app/staff/message-center-workspace.tsx", root), "utf8"),
    readFile(new URL("docs/message-center-contract.md", root), "utf8"),
  ]);
  assert.match(workspace, /Restore to inbox/);
  assert.doesNotMatch(workspace, />Delete</);
  assert.match(contract, /MESSAGE_DELETION_DISABLED/);
  assert.match(contract, /MESSAGE_ALREADY_CONVERTED/);
});
