import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function render(pathname = "/staff") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the staff login route", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Staff sign in · CIS Staff Hub<\/title>/i);
  assert.match(html, /Welcome back/);
  assert.match(html, /Secure staff access/);
  assert.match(html, /Prototype sign-in paths/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("keeps capability and mock persona policy centralized", async () => {
  const [staff, portal, layout, packageJson] = await Promise.all([
    readFile(new URL("lib/staff.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(staff, /export function can/);
  assert.match(staff, /staff-restricted/);
  assert.match(staff, /shipping\.export/);
  assert.doesNotMatch(staff, /payroll/i);
  assert.match(portal, /process\.env\.NODE_ENV !== "production"/);
  assert.match(portal, /Session credentials[\s\S]*never stored in browser storage/);
  assert.match(layout, /CIS Staff Hub/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
