import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Execute the actual transport and UI modules, rather than asserting source text.
const modules = new Map();
async function sourceModule(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const source = await readFile(new URL(`../${relative}`, import.meta.url), "utf8");
  let output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  for (const specifier of [...output.matchAll(/from ["']([^"']+)["']/g)].map(match => match[1])) {
    const resolved = specifier.startsWith(".")
      ? await sourceModule(new URL(specifier + ".ts", `file:///${relative}`).pathname.slice(1))
      : import.meta.resolve(specifier);
    output = output.replaceAll(`"${specifier}"`, JSON.stringify(resolved));
  }
  const url = `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
  modules.set(relative, url); return url;
}
const transport = await import(await sourceModule("lib/staff-api.ts"));
const api = await import(await sourceModule("lib/student-api.ts"));
const ui = await import(await sourceModule("app/staff/student-record-tools.tsx"));

function mockFetch(t, implementation) {
  const original = globalThis.fetch;
  globalThis.fetch = implementation;
  t.after(() => { globalThis.fetch = original; });
}

test("student detail normalizes omitted legacy collections without fabricating records", async t => {
  mockFetch(t, async () => Response.json({ data: { customerid: 10, name: "Jane" } }));
  const { data } = await api.getStudent(10);
  for (const key of ["documents", "online_courses", "live_classes", "class_managements", "subscribed_tests", "notes"]) assert.deepEqual(data[key], []);
  assert.equal(data.corporation, null);
});

test("student operations use scoped routes, methods, and same-origin session credentials", async t => {
  const calls = [];
  mockFetch(t, async (path, init) => { calls.push({ path, init }); return Response.json({ message: "Saved" }); });
  await api.saveStudentAccess(10, "live_classes", { live_class_category_id: 2, end_enroll: "2026-12-01", status: 1 }, 5);
  await api.removeStudentAccess(10, "subscribed_tests", 7);
  await api.addStudentNote(10, "Call student");
  await api.synchronizeStudent(10);
  assert.deepEqual(calls.map(call => [call.path, call.init.method]), [
    ["/api/v1/staff/students/10/access/live_classes/5", "PATCH"],
    ["/api/v1/staff/students/10/access/subscribed_tests/7", "DELETE"],
    ["/api/v1/staff/students/10/notes", "POST"],
    ["/api/v1/staff/students/10/synchronize", "POST"],
  ]);
  for (const call of calls) assert.equal(call.init.credentials, "include");
  assert.equal(JSON.parse(calls[0].init.body).live_class_category_id, 2);
});

test("document upload keeps multipart boundaries and downloads preserve bytes", async t => {
  const content = "%PDF-1.4 private data";
  mockFetch(t, async (path, init) => {
    if (init.method === "POST") {
      assert.ok(init.body instanceof FormData);
      assert.equal(init.headers["content-type"], undefined);
      assert.equal(await init.body.get("file").text(), content);
      return Response.json({ data: { id: 1 } });
    }
    assert.equal(path, "/api/v1/staff/students/10/documents/attachment/1");
    return new Response(content, { headers: { "content-type": "application/octet-stream" } });
  });
  await api.uploadStudentDocument(10, new File([content], "record.pdf", { type: "application/pdf" }), "Record");
  assert.equal(await (await api.downloadStudentDocument(10, { id: 1, kind: "attachment" })).text(), content);
});

test("protected 401s expire the shell and provider/validation errors remain visible", async t => {
  const originalWindow = globalThis.window;
  globalThis.window = new EventTarget(); t.after(() => { globalThis.window = originalWindow; });
  let expired = 0; window.addEventListener(transport.STAFF_SESSION_EXPIRED_EVENT, () => expired++);
  mockFetch(t, async () => Response.json({ message: "Session expired" }, { status: 401 }));
  await assert.rejects(api.studentEmailHistory(10), error => error.status === 401 && error.code === "SESSION_EXPIRED");
  assert.equal(expired, 1);
  globalThis.fetch = async () => Response.json({ message: "Email provider unavailable" }, { status: 503 });
  await assert.rejects(api.sendStudentEmail(10, "Subject", "Message", "key"), /Email provider unavailable/);
  globalThis.fetch = async () => new Response("<html>Unavailable</html>", { status: 422 });
  await assert.rejects(api.saveStudentAccess(10, "live_classes", {}), error => error.code === "VALIDATION_ERROR");
  globalThis.fetch = async () => Response.json({ message: "The given data was invalid.", errors: { end_enroll: ["Choose an expiration date."] } }, { status: 422 });
  await assert.rejects(api.saveStudentAccess(10, "live_classes", {}), /Choose an expiration date/);
});

test("email requests preserve their idempotency key and template ownership route", async t => {
  const calls = [];
  mockFetch(t, async (path, init) => { calls.push({ path, init }); return Response.json({ data: {} }); });
  await api.sendStudentEmail(10, "Subject", "Hello {firstname}", "same-attempt", 5);
  await api.studentEmailTemplate(10, 5);
  assert.deepEqual(JSON.parse(calls[0].init.body), { email_subject: "Subject", email_content: "Hello {firstname}", idempotency_key: "same-attempt", email_template_id: 5 });
  assert.equal(calls[1].path, "/api/v1/staff/student_brochure_email_template/5/10");
});

test("capability-shaped document and course UI hides writes for viewers", () => {
  const props = { studentId: 10, canManage: false, onChanged: async () => {} };
  const docs = renderToStaticMarkup(createElement(ui.StudentDocuments, { ...props, documents: [{ id: 1, kind: "attachment", name: "record.pdf", description: "Student record" }] }));
  assert.match(docs, /Download/); assert.doesNotMatch(docs, /Remove|Upload document/);
  const courses = renderToStaticMarkup(createElement(ui.StudentAccessPanel, { ...props, kind: "live_classes", title: "Live classes", rows: [{ id: 1, label: "Law", status: 1, end_enroll: "2026-12-01" }] }));
  assert.match(courses, /Law/); assert.match(courses, /2026-12-01/); assert.doesNotMatch(courses, /Edit|Remove|Add live classes/);
  const manager = renderToStaticMarkup(createElement(ui.StudentDocuments, { ...props, canManage: true, documents: [] }));
  assert.match(manager, /type="file"/); assert.match(manager, /Upload document/); assert.match(manager, /<label[^>]*><span>Document<\/span><input/);
});

test("history renders safely and sync results distinguish failed/disabled destinations", () => {
  const html = renderToStaticMarkup(createElement(ui.StudentCommunication, { studentId: 10, canManage: false }));
  assert.doesNotMatch(html, /Send email|<textarea/);
  assert.equal(ui.syncMessage({ application_fee: { status: "failed" }, active_campaign: { status: "disabled" } }), "application fee: failed; active campaign: disabled");
  const application = renderToStaticMarkup(createElement(ui.StudentApplicationTools, { studentId: 10, canManage: true, onChanged: async () => {}, prescreenChoice: "ADDITIONAL_CLASSIFICATION" }));
  assert.match(application, /<option value="yes" selected=""/);
  const document = renderToStaticMarkup(createElement(ui.StudentDocuments, { studentId: 10, canManage: false, onChanged: async () => {}, documents: [{ id: 1, kind: "attachment", name: "record.pdf", description: "<script>alert(1)</script>" }] }));
  assert.doesNotMatch(document, /<script>/); assert.match(document, /&lt;script&gt;/);
});
