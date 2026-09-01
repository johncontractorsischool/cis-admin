import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships every legacy brochure workflow and the brochure detail page", async () => {
  const routeFiles = [
    "app/staff/brochures/new/page.tsx",
    "app/staff/brochures/followups/page.tsx",
    "app/staff/brochures/request/page.tsx",
    "app/staff/brochures/search/page.tsx",
    "app/staff/brochure-templates/page.tsx",
    "app/staff/brochures/[id]/page.tsx",
  ];
  const [workspace, api, navigation, ...routes] = await Promise.all([
    readFile(new URL("app/staff/brochure-workspace.tsx", root), "utf8"),
    readFile(new URL("lib/brochure-api.ts", root), "utf8"),
    readFile(new URL("app/staff/staff-portal.tsx", root), "utf8"),
    ...routeFiles.map((file) => readFile(new URL(file, root), "utf8")),
  ]);

  for (const label of ["New Brochures", "Today’s Followups", "Request Brochure", "Search Brochures", "Manage Templates"]) {
    assert.match(`${workspace}\n${navigation}`, new RegExp(label));
  }
  for (const operation of ["createBrochure", "updateBrochure", "toggleBrochureStatus", "moveBrochureCallbacks", "sendBrochureEmail", "getBrochureEmailHistory"]) {
    assert.match(workspace, new RegExp(operation));
  }
  assert.match(api, /brochures\/export/);
  assert.equal(routes.length, routeFiles.length);
  assert.ok(routes.every((route) => /StaffPortal|redirect/.test(route)));
});

test("keeps brochure records and email operations behind the staff gateway", async () => {
  const [gateway, api, contract] = await Promise.all([
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("lib/brochure-api.ts", root), "utf8"),
    readFile(new URL("docs/brochures-contract.md", root), "utf8"),
  ]);

  assert.match(gateway, /handleFixtureBrochures/);
  assert.match(api, /move_selected_callbacks/);
  assert.match(api, /brochure_email_templates/);
  assert.doesNotMatch(`${gateway}\n${api}`, /localStorage|sessionStorage/);
  assert.match(contract, /contractor-api/i);
});
