import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);

async function builtText(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return builtText(target);
    return readFile(target, "utf8").catch(() => "");
  }));
  return parts.join("\n");
}

test("production artifacts exclude fixture credentials, OTPs, metrics, and controls", async () => {
  const production = await builtText(fileURLToPath(new URL("../dist", import.meta.url)));

  for (const fixtureOnlyText of [
    "Local fixture paths",
    "2468101",
    "fixture-offsite-challenge",
    "staff-demo",
    "No new fixture updates.",
    "This operational data is available only in explicit local fixture mode.",
  ]) {
    assert.doesNotMatch(production, new RegExp(fixtureOnlyText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("session transport restores Laravel auth and expires the UI on protected 401s", async () => {
  const [api, gateway, portal] = await Promise.all([
    readFile(new URL("lib/staff-api.ts", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
  ]);

  assert.match(gateway, /path === "\/me" \? "\/auth\/me"/);
  assert.match(gateway, /path === "\/logout" \? "\/auth\/logout"/);
  assert.match(gateway, /path === "\/logout" && upstream\.status === 401[\s\S]*status: 204/);
  assert.match(gateway, /upstream\.status === 401[\s\S]*clearCookie\(TOKEN_COOKIE/);
  assert.match(api, /STAFF_SESSION_EXPIRED_EVENT/);
  assert.match(api, /window\.dispatchEvent/);
  assert.match(portal, /addEventListener\(STAFF_SESSION_EXPIRED_EVENT, expireSession\)/);
  assert.match(portal, /Your session has expired\. Sign in again\./);
});

test("production UI trusts server capabilities and limits navigation to live workspaces", async () => {
  const [gateway, portal] = await Promise.all([
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
  ]);

  assert.match(gateway, /Array\.isArray\(staff\.capabilities\)/);
  assert.match(portal, /new Set\(\["Dashboard", "New Orders", "Message Center", "Students", "Customer Devices", "Brochures", "Settings"\]\)/);
  assert.match(portal, /<AuthenticatedHome principal=\{principal\}/);
  assert.match(portal, /__STAFF_FIXTURE_AUTH__ && fixtureMode/);
});
