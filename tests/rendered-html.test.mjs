import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const env = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};
const context = { waitUntil() {}, passThroughOnException() {} };

async function request(pathname, init) {
  const builtWorker = await worker();
  return builtWorker.fetch(
    new Request(`http://localhost${pathname}`, init),
    env,
    context,
  );
}

test("server-renders the production-safe staff login route", async () => {
  const response = await request("/staff", { headers: { accept: "text/html" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Staff workspace · CIS Staff Hub<\/title>/i);
  assert.match(html, /Welcome back/);
  assert.match(html, /Secure staff access/);
  assert.match(html, /sign-in service is not configured yet/i);
  const renderedMarkup = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
  assert.doesNotMatch(
    renderedMarkup,
    /Local fixture paths|2468101|New orders|persona|prototype/i,
  );
});

test("fails closed with a stable no-store response when Laravel is unavailable", async () => {
  const response = await request("/api/v1/staff/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "staff", password: "not-logged" }),
  });

  assert.equal(response.status, 503);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.deepEqual(await response.json(), {
    error: {
      code: "AUTH_UNAVAILABLE",
      message: "The sign-in service is temporarily unavailable. Please retry.",
    },
  });
});

test("keeps capability policy and auth transport centralized", async () => {
  const [staff, portal, gateway, fixture, contract, packageJson] = await Promise.all([
    readFile(new URL("lib/staff.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("lib/staff-fixtures.ts", root), "utf8"),
    readFile(new URL("docs/staff-auth-contract.md", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);

  assert.match(staff, /export function can/);
  assert.match(staff, /interface OtpChallenge/);
  assert.doesNotMatch(staff, /staff-demo|2468101|payroll/i);
  assert.match(gateway, /cache-control.*no-store/i);
  assert.match(gateway, /x-forwarded-for/);
  assert.match(gateway, /set-cookie/i);
  assert.match(fixture, /__STAFF_FIXTURE_AUTH__/);
  assert.match(
    await readFile(new URL("vite.config.ts", root), "utf8"),
    /process\.env\.NODE_ENV !== "production"[\s\S]*STAFF_AUTH_MODE === "fixture"/,
  );
  assert.match(contract, /HttpOnly/);
  assert.match(contract, /SameSite=Lax/);
  assert.doesNotMatch(`${portal}\n${gateway}`, /localStorage|sessionStorage|console\.(?:log|info|debug)/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
});
