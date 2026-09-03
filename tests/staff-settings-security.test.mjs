import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships profile and capability-gated system settings routes", async () => {
  const [portal, settingsPage, profilePage, workspace, api] = await Promise.all([
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    readFile(new URL("app/staff/settings/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/profile/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/settings-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/staff-settings-api.ts", root), "utf8"),
  ]);

  assert.match(settingsPage, /initialPage="settings"/);
  assert.match(profilePage, /initialPage="profile"/);
  assert.match(portal, /can\(principal, "settings\.manage"\)/);
  assert.match(portal, /href="\/staff\/profile"/);
  for (const label of ["Profile details", "Office locations", "Class locations", "Approved office IPs", "Firewall rules", "Payment-method visibility", "SKU catalog", "Enrollment agreements"]) assert.match(workspace, new RegExp(label));
  for (const path of ["/profile/password", "/settings/class-locations", "/settings/firewall", "/settings/checkout-payment-methods", "/settings/skus", "/settings/enrollment-agreements"]) assert.match(api, new RegExp(path.replaceAll("/", "\\/")));
});

test("keeps secrets out of browser persistence and documents server enforcement", async () => {
  const [workspace, api, gateway, contract] = await Promise.all([
    readFile(new URL("app/staff/settings-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/staff-settings-api.ts", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("docs/staff-settings-security-contract.md", root), "utf8"),
  ]);
  assert.doesNotMatch(`${workspace}\n${api}\n${gateway}`, /localStorage|sessionStorage|console\.(?:log|info|debug)/);
  assert.doesNotMatch(api, /password.*GET|signature.*innerHTML/i);
  assert.match(contract, /prevent the current request IP from being removed or blocked/i);
  assert.match(contract, /authoritative in Laravel/i);
  assert.match(contract, /archived instead of deleted/i);
  assert.match(contract, /body hash/i);
});
