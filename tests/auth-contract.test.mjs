import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("documents every staff authentication endpoint and stable error code", async () => {
  const [contract, types, gateway] = await Promise.all([
    readFile(new URL("docs/staff-auth-contract.md", root), "utf8"),
    readFile(new URL("lib/staff.ts", root), "utf8"),
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
  ]);

  assert.match(gateway, /path === "\/me" \|\| path === "\/logout"/);
  assert.match(gateway, /path: `\/auth\$\{path\}`/);

  for (const endpoint of [
    "POST /api/v1/staff/auth/login",
    "POST /api/v1/staff/auth/challenges/{id}/verify",
    "POST /api/v1/staff/auth/challenges/{id}/resend",
    "GET /api/v1/staff/me",
    "POST /api/v1/staff/logout",
  ]) {
    assert.match(contract, new RegExp(endpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const code of [
    "INVALID_CREDENTIALS",
    "ACCOUNT_INACTIVE",
    "OFFSITE_DISABLED",
    "INVALID_OTP",
    "CHALLENGE_EXPIRED",
    "RATE_LIMITED",
    "SESSION_EXPIRED",
    "AUTH_UNAVAILABLE",
    "VALIDATION_ERROR",
  ]) {
    assert.match(contract, new RegExp(code));
    assert.match(types, new RegExp(code));
  }
});
