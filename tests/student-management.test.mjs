import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships real student list, create, and detail routes", async () => {
  const [listPage, createPage, detailPage, workspace] = await Promise.all([
    readFile(new URL("app/staff/students/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/students/new/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/students/[id]/page.tsx", root), "utf8"),
    readFile(new URL("app/staff/student-workspace.tsx", root), "utf8"),
  ]);

  assert.match(listPage, /initialPage="students"/);
  assert.match(createPage, /initialPage="student-new"/);
  assert.match(detailPage, /initialPage="student-detail"/);
  for (const operation of [
    "listStudents",
    "getStudent",
    "createStudent",
    "updateStudent",
    "toggleStudent",
    "copyStudentToPbia",
    "updateStudentPassword",
    "sendStudentEmail",
  ]) assert.match(workspace, new RegExp(operation));
});

test("keeps the contractor-api bearer token server-side", async () => {
  const [gateway, session, studentApi, contract] = await Promise.all([
    readFile(new URL("lib/staff-gateway.ts", root), "utf8"),
    readFile(new URL("lib/staff-session.ts", root), "utf8"),
    readFile(new URL("lib/student-api.ts", root), "utf8"),
    readFile(new URL("docs/student-management-contract.md", root), "utf8"),
  ]);

  assert.match(gateway, /\/api\/v2\/staff/);
  assert.match(gateway, /cis_staff_token/);
  assert.match(session, /authorization: `Bearer \$\{token\}`/);
  assert.doesNotMatch(`${gateway}\n${session}\n${studentApi}`, /localStorage|sessionStorage/);
  assert.match(contract, /excludes password hashes/i);
});
