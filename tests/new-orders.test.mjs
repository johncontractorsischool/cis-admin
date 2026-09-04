import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the complete legacy new-order workflow", async () => {
  const [page, workspace, api, navigation] = await Promise.all([
    readFile(new URL("app/staff/new_order/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/new-order-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/new-order-api.ts", root), "utf8"),
    readFile(new URL("lib/staff.ts", root), "utf8"),
  ]);

  assert.match(page, /initialPage="new-order"/);
  assert.match(navigation, /New Orders/);
  for (const operation of ["listNewOrders", "getNewOrder", "updateNewOrder", "markNewOrderShipped", "markNewOrdersShipped", "getNewOrderPrintDocument"]) assert.match(workspace, new RegExp(operation));
  for (const action of ["Print labels", "Print invoices", "Mark selected shipped"]) assert.match(workspace, new RegExp(action, "i"));
  assert.match(api, /\/new_order\/shipped_selected/);
  assert.match(api, /\/new_order\/\$\{kind\}/);
  assert.doesNotMatch(workspace, /Promise\.all\(\[\.\.\.selected\]/);
});
test("keeps order data behind the server-side staff gateway", async () => {
  const [gateway, api, contract] = await Promise.all([
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("lib/new-order-api.ts", root), "utf8"),
    readFile(new URL("docs/new-orders-contract.md", root), "utf8"),
  ]);

  assert.match(gateway, /handleFixtureNewOrders/);
  assert.doesNotMatch(`${gateway}\n${api}`, /localStorage|sessionStorage/);
  assert.match(contract, /payment credentials.*excluded/i);
});
