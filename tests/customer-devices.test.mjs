import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the customer devices page with the complete legacy workflow", async () => {
  const [page, workspace, api, navigation] = await Promise.all([
    readFile(new URL("app/staff/customer-devices/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/customer-devices-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/customer-device-api.ts", root), "utf8"),
    readFile(new URL("lib/staff.ts", root), "utf8"),
  ]);

  assert.match(page, /initialPage="customer-devices"/);
  assert.match(navigation, /Customer Devices/);
  for (const field of ["Email", "Device type", "Device ID", "IP address", "Location", "User agent"]) {
    assert.match(workspace, new RegExp(field, "i"));
  }
  assert.match(api, /listCustomerDevices/);
  assert.match(api, /downloadCustomerDevices/);
  assert.match(api, /deleteCustomerDevice/);
});
test("keeps customer device data on the authenticated same-origin gateway", async () => {
  const [gateway, api, contract] = await Promise.all([
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("lib/customer-device-api.ts", root), "utf8"),
    readFile(new URL("docs/customer-devices-contract.md", root), "utf8"),
  ]);

  assert.match(gateway, /handleFixtureCustomerDevices/);
  assert.match(api, /\/api\/v1\/staff\/customer-devices/);
  assert.doesNotMatch(`${gateway}\n${api}`, /localStorage|sessionStorage/);
  assert.match(contract, /credentials.*excluded/i);
});
