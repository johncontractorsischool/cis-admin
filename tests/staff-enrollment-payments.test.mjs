import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships a capability-gated customer enrollment and payment workspace", async () => {
  const [page, shell, queue, workspace, api] = await Promise.all([
    readFile(new URL("app/staff/enrollments/new/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    readFile(new URL("app/staff/new-order-workspace.tsx", root), "utf8"),
    readFile(new URL("app/staff/enrollment-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/staff-enrollment-api.ts", root), "utf8"),
  ]);

  assert.match(page, /initialPage="enrollment-new"/);
  assert.match(shell, /orders\.create/);
  assert.match(queue, /Create customer order/);
  for (const label of ["Customer ID", "SKU", "Classification", "Shipping method", "Discount", "Billing information", "Shipping information", "Payment method"]) assert.match(workspace, new RegExp(label));
  assert.match(api, /\/enrollments\/options/);
  assert.match(api, /\/enrollments\/quote/);
  assert.match(api, /\/enrollments\/orders/);
});

test("tokenizes cards before the same-origin staff API and stores no payment secrets", async () => {
  const [workspace, api, gateway, contract] = await Promise.all([
    readFile(new URL("app/staff/enrollment-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/staff-enrollment-api.ts", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("docs/staff-enrollment-payments-contract.md", root), "utf8"),
  ]);
  assert.match(workspace, /Accept\.dispatchData/);
  assert.match(workspace, /opaque_data_descriptor/);
  assert.match(workspace, /opaque_data_value/);
  assert.doesNotMatch(`${workspace}\n${api}\n${gateway}`, /localStorage|sessionStorage/);
  assert.doesNotMatch(api, /card_number|cvv|cardCode|expiration/);
  assert.match(contract, /Raw card fields are explicitly rejected/);
  assert.match(contract, /Idempotency keys prevent duplicate orders and duplicate charges/);
});
