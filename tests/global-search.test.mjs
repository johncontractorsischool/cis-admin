import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("replaces the fixture-only command search with the authenticated global search", async () => {
  const [portal, api, contract] = await Promise.all([
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    readFile(new URL("lib/global-search-api.ts", root), "utf8"),
    readFile(new URL("docs/global-search-contract.md", root), "utf8"),
  ]);

  assert.match(portal, /searchStaff/);
  assert.match(portal, /Search students, orders, brochures, and applications/);
  assert.match(portal, /ArrowDown/);
  assert.match(portal, /aria-activedescendant/);
  assert.doesNotMatch(portal, /No matching customers in this local fixture/);
  assert.match(api, /\/search\?q=/);
  assert.match(contract, /passwords, session tokens, payment credentials, and raw application payloads are excluded/i);
});

test("ships working authenticated destinations for order and application results", async () => {
  const [orderPage, applicationPage, workspace] = await Promise.all([
    readFile(new URL("app/staff/orders/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/applications/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/search-record-workspace.tsx", root), "utf8"),
  ]);

  assert.match(orderPage, /initialPage="order-detail"/);
  assert.match(applicationPage, /initialPage="application-detail"/);
  assert.match(workspace, /getOrderRecord/);
  assert.match(workspace, /getApplicationRecord/);
  assert.doesNotMatch(workspace, /card_last_four|dashboard_json|password/i);
});
