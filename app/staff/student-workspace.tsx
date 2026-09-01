"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  copyStudentToPbia,
  createStudent,
  getStudent,
  listStudents,
  sendStudentEmail,
  toggleStudent,
  updateStudent,
  updateStudentPassword,
  type StudentFilters,
} from "../../lib/student-api";
import { StaffApiError } from "../../lib/staff-api";
import type { StaffPrincipal } from "../../lib/staff";
import type {
  StudentDetail,
  StudentInput,
  StudentPagination,
  StudentRecordValue,
  StudentSummary,
} from "../../lib/students";

function fullName(student: Pick<StudentSummary, "name" | "lname">) {
  return [student.name, student.lname].filter(Boolean).join(" ");
}

function formatDate(value: StudentRecordValue | undefined) {
  if (!value) return "—";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function readableError(caught: unknown) {
  return caught instanceof StaffApiError
    ? caught.message
    : "We couldn’t load this student information. Please try again.";
}

function accountLabel(student: StudentSummary) {
  if (student.disabled || Number(student.account_status) === 0) return "Disabled";
  return Number(student.account_type) === 1 ? "Full account" : "Demo account";
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`student-field ${wide ? "student-field-wide" : ""}`}><span>{label}</span>{children}</label>;
}

function textValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function RecordTable({ rows, empty }: { rows: Array<Record<string, StudentRecordValue>>; empty: string }) {
  if (!rows.length) return <div className="student-empty compact"><strong>{empty}</strong><span>New records will appear here when they are added in the source system.</span></div>;
  const columns = Object.keys(rows[0]).filter((column) => !["created_at", "updated_at"].includes(column)).slice(0, 6);
  return (
    <div className="student-table-scroll compact-table">
      <table className="student-table">
        <thead><tr>{columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={String(row.id ?? index)}>{columns.map((column) => <td key={column}>{column.includes("date") || column.includes("enroll") ? formatDate(row[column]) : textValue(row[column]) || "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export function StudentDirectory({ principal }: { principal: StaffPrincipal }) {
  const [draftFilters, setDraftFilters] = useState<StudentFilters>({ page: 1, perPage: 25 });
  const [filters, setFilters] = useState<StudentFilters>({ page: 1, perPage: 25 });
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [pagination, setPagination] = useState<StudentPagination>({ current_page: 1, per_page: 25, total: 0, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listStudents(filters)
      .then((response) => {
        if (!active) return;
        setStudents(response.data.items);
        setPagination(response.meta.pagination);
      })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setFilters({ ...draftFilters, page: 1, perPage: 25 });
  }

  function clearFilters() {
    const clear = { page: 1, perPage: 25 };
    setLoading(true);
    setError("");
    setDraftFilters(clear);
    setFilters(clear);
  }

  return (
    <div className="student-workspace">
      <header className="student-page-header">
        <div><p className="eyebrow">Customer operations</p><h1>Students</h1><p>Find customer accounts, check enrollment status, and open the complete student record.</p></div>
        {principal.capabilities.includes("students.create") ? <Link className="primary-button student-add-link" href="/staff/students/new"><span aria-hidden="true">＋</span> Add student</Link> : null}
      </header>

      <section className="student-filter-card" aria-label="Student filters">
        <form onSubmit={search}>
          <Field label="Search students" wide><div className="student-search-wrap"><span aria-hidden="true">⌕</span><input value={draftFilters.search ?? ""} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Name, email, or phone" /></div></Field>
          <Field label="Account type"><select value={draftFilters.accountType ?? ""} onChange={(event) => setDraftFilters((current) => ({ ...current, accountType: event.target.value }))}><option value="">All account types</option><option value="1">Full account</option><option value="0">Demo account</option></select></Field>
          <Field label="Status"><select value={draftFilters.accountStatus ?? ""} onChange={(event) => setDraftFilters((current) => ({ ...current, accountStatus: event.target.value }))}><option value="">All statuses</option><option value="1">Active</option><option value="0">Disabled</option></select></Field>
          <Field label="Added after"><input type="date" value={draftFilters.startDate ?? ""} onChange={(event) => setDraftFilters((current) => ({ ...current, startDate: event.target.value }))} /></Field>
          <Field label="Added before"><input type="date" value={draftFilters.endDate ?? ""} onChange={(event) => setDraftFilters((current) => ({ ...current, endDate: event.target.value }))} /></Field>
          <div className="student-filter-actions"><button className="primary-button" type="submit">Search</button><button className="secondary-button" type="button" onClick={clearFilters}>Clear</button></div>
        </form>
      </section>

      <section className="student-list-card">
        <header className="student-list-head"><div><h2>Student directory</h2><p>{loading ? "Loading student records…" : `${pagination.total.toLocaleString()} ${pagination.total === 1 ? "student" : "students"}`}</p></div><span className="student-api-chip"><span aria-hidden="true" /> Live API data</span></header>
        {error ? <div className="student-error" role="alert"><strong>Student records are unavailable.</strong><span>{error}</span><button type="button" className="text-button" onClick={() => { setLoading(true); setError(""); setFilters({ ...filters }); }}>Try again</button></div> : null}
        {!error && loading ? <div className="student-loading" aria-live="polite">Loading the latest student records…</div> : null}
        {!error && !loading && !students.length ? <div className="student-empty"><strong>No students match these filters.</strong><span>Try a broader name, email, date range, or account type.</span><button type="button" className="secondary-button" onClick={clearFilters}>Clear filters</button></div> : null}
        {!error && !loading && students.length ? (
          <div className="student-table-scroll">
            <table className="student-table">
              <thead><tr><th>Student</th><th>Contact</th><th>Classification</th><th>Account</th><th>Enrollment</th><th><span className="sr-only">Open</span></th></tr></thead>
              <tbody>{students.map((student) => <tr key={student.customerid}>
                <td><Link className="student-name-link" href={`/staff/students/${student.customerid}`}><span className="student-initials">{student.name[0]}{student.lname?.[0] ?? ""}</span><span><strong>{fullName(student)}</strong><small>Customer #{student.customerid}</small></span></Link></td>
                <td><span className="table-stack"><strong>{student.email}</strong><small>{student.mobilenum || "No phone on file"}</small></span></td>
                <td><span className="classification-chip">{student.Classification || "Not set"}</span></td>
                <td><span className={`account-pill ${student.disabled || Number(student.account_status) === 0 ? "disabled" : Number(student.account_type) === 1 ? "full" : "demo"}`}>{accountLabel(student)}</span></td>
                <td><span className="table-stack"><strong>{student.extension_date ? "Through " + formatDate(student.extension_date) : "No active term"}</strong><small>{student.orderdate ? "Enrolled " + formatDate(student.orderdate) : "No order date"}</small></span></td>
                <td><Link className="row-open" href={`/staff/students/${student.customerid}`} aria-label={`Open ${fullName(student)}`}>→</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        ) : null}
        {pagination.last_page > 1 ? <footer className="student-pagination"><span>Page {pagination.current_page} of {pagination.last_page}</span><div><button className="secondary-button" type="button" disabled={pagination.current_page <= 1} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page - 1 })); }}>Previous</button><button className="secondary-button" type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page + 1 })); }}>Next</button></div></footer> : null}
      </section>
    </div>
  );
}

const emptyInput: StudentInput = {
  name: "", lname: "", email: "", previous_email: "", mobilenum: "", mobilenum_extension: "",
  Classification: "", company_name: "", fee_license: "", account_type: 1, account_status: 1,
  address: "", city: "", state: "CA", zip: "", firsttime: "", extension_date: "",
  re_enrollment_date: "", application_date: "", app_review_expiration_date: "", Notes: "",
  test_date_law: "", test_date_trade: "", new_test_date: "", es_access: 0, iapp_access: 0,
};

function ProfileFields({ value, onChange }: { value: StudentInput; onChange: (field: keyof StudentInput, value: string | number) => void }) {
  return <>
    <Field label="First name"><input required value={textValue(value.name)} onChange={(event) => onChange("name", event.target.value)} /></Field>
    <Field label="Last name"><input value={textValue(value.lname)} onChange={(event) => onChange("lname", event.target.value)} /></Field>
    <Field label="Email"><input required type="email" value={textValue(value.email)} onChange={(event) => onChange("email", event.target.value)} /></Field>
    <Field label="Previous email"><input type="email" value={textValue(value.previous_email)} onChange={(event) => onChange("previous_email", event.target.value)} /></Field>
    <Field label="Mobile phone"><input type="tel" value={textValue(value.mobilenum)} onChange={(event) => onChange("mobilenum", event.target.value)} /></Field>
    <Field label="Extension"><input value={textValue(value.mobilenum_extension)} onChange={(event) => onChange("mobilenum_extension", event.target.value)} /></Field>
    <Field label="Company"><input value={textValue(value.company_name)} onChange={(event) => onChange("company_name", event.target.value)} /></Field>
    <Field label="Classification"><input value={textValue(value.Classification)} onChange={(event) => onChange("Classification", event.target.value.toUpperCase())} placeholder="B, C-10, A…" /></Field>
    <Field label="App fee / license #"><input value={textValue(value.fee_license)} onChange={(event) => onChange("fee_license", event.target.value)} /></Field>
    <Field label="Account type"><select value={textValue(value.account_type)} onChange={(event) => onChange("account_type", Number(event.target.value))}><option value="1">Full account</option><option value="0">Demo account</option></select></Field>
    <Field label="Address" wide><input value={textValue(value.address)} onChange={(event) => onChange("address", event.target.value)} /></Field>
    <Field label="City"><input value={textValue(value.city)} onChange={(event) => onChange("city", event.target.value)} /></Field>
    <Field label="State"><input maxLength={2} value={textValue(value.state)} onChange={(event) => onChange("state", event.target.value.toUpperCase())} /></Field>
    <Field label="ZIP"><input inputMode="numeric" value={textValue(value.zip)} onChange={(event) => onChange("zip", event.target.value)} /></Field>
  </>;
}

export function StudentCreate() {
  const [form, setForm] = useState<StudentInput>(emptyInput);
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  function change(field: keyof StudentInput, value: string | number) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const response = await createStudent({ ...form, ...(password ? { password } : {}) });
      window.location.assign(`/staff/students/${response.data.customerid}`);
    } catch (caught) { setError(readableError(caught)); setPending(false); }
  }
  return <div className="student-workspace detail-workspace">
    <Link className="student-back" href="/staff/students">← Back to students</Link>
    <header className="student-page-header"><div><p className="eyebrow">New customer account</p><h1>Add student</h1><p>Create the core student profile. Enrollments and application records can be added after saving.</p></div></header>
    <form className="student-detail-form" onSubmit={submit}>
      {error ? <div className="student-error" role="alert"><strong>Student could not be created.</strong><span>{error}</span></div> : null}
      <section className="student-section-card"><header><div><h2>Personal information</h2><p>Contact, account, and classification details.</p></div></header><div className="student-form-grid"><ProfileFields value={form} onChange={change} /><Field label="Temporary password"><input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Optional, at least 8 characters" /></Field></div></section>
      <div className="student-sticky-actions"><Link className="secondary-button" href="/staff/students">Cancel</Link><button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating student…" : "Create student"}</button></div>
    </form>
  </div>;
}

export function StudentDetails({ studentId }: { studentId: number }) {
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [form, setForm] = useState<StudentInput>(emptyInput);
  const [tab, setTab] = useState<"profile" | "enrollments" | "activity" | "actions">("profile");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");

  useEffect(() => {
    let active = true;
    getStudent(studentId).then((response) => {
      if (!active) return;
      setStudent(response.data);
      setForm(response.data);
    }).catch((caught) => { if (active) setError(readableError(caught)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId]);

  function change(field: keyof StudentInput, value: string | number) { setForm((current) => ({ ...current, [field]: value })); }
  async function run(action: () => Promise<{ message: string }>, success?: string) {
    setPending(true); setError(""); setNotice("");
    try { const response = await action(); setNotice(success ?? response.message); }
    catch (caught) { setError(readableError(caught)); }
    finally { setPending(false); }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await run(async () => {
      const response = await updateStudent(studentId, form);
      setStudent((current) => current ? { ...current, ...response.data } : current);
      return response;
    });
  }

  if (loading) return <div className="student-loading page-loading">Loading the complete student record…</div>;
  if (!student) return <div className="student-workspace"><Link className="student-back" href="/staff/students">← Back to students</Link><div className="student-error"><strong>Student record unavailable.</strong><span>{error || "This record may have been removed."}</span></div></div>;

  const tabs = [{ key: "profile", label: "Profile" }, { key: "enrollments", label: "Courses & classes" }, { key: "activity", label: "Documents & notes" }, { key: "actions", label: "Staff actions" }] as const;
  return <div className="student-workspace detail-workspace">
    <Link className="student-back" href="/staff/students">← Back to students</Link>
    <header className="student-record-header">
      <div className="student-record-identity"><span className="student-record-avatar">{student.name[0]}{student.lname?.[0] ?? ""}</span><div><div className="student-title-line"><h1>{fullName(student)}</h1><span className={`account-pill ${student.disabled ? "disabled" : "full"}`}>{accountLabel(student)}</span></div><p>{student.email} · Customer #{student.customerid}</p></div></div>
      <div className="student-record-actions"><button className="secondary-button" type="button" disabled={pending} onClick={() => void run(() => copyStudentToPbia(studentId))}>Copy to PBIA</button><button className={`secondary-button ${student.disabled ? "success-button" : "danger-button"}`} type="button" disabled={pending} onClick={() => void run(async () => { const response = await toggleStudent(studentId); setStudent((current) => current ? { ...current, disabled: response.data.disabled } : current); return response; })}>{student.disabled ? "Enable account" : "Disable account"}</button></div>
    </header>
    {notice ? <div className="student-success" role="status"><strong>Saved.</strong><span>{notice}</span></div> : null}
    {error ? <div className="student-error" role="alert"><strong>That action could not be completed.</strong><span>{error}</span></div> : null}
    <nav className="student-tabs" aria-label="Student record sections">{tabs.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} type="button" onClick={() => setTab(item.key)}>{item.label}</button>)}</nav>

    {tab === "profile" ? <form className="student-detail-form" onSubmit={save}>
      <section className="student-section-card"><header><div><h2>Personal information</h2><p>The core contact and customer details used across CIS systems.</p></div><span className="section-number">01</span></header><div className="student-form-grid"><ProfileFields value={form} onChange={change} /></div></section>
      <section className="student-section-card"><header><div><h2>Enrollment & application dates</h2><p>Dates shown on the legacy student detail page.</p></div><span className="section-number">02</span></header><div className="student-form-grid">
        <Field label="Extension date"><input type="date" value={textValue(form.extension_date).slice(0, 10)} onChange={(event) => change("extension_date", event.target.value)} /></Field>
        <Field label="Re-enrollment date"><input type="date" value={textValue(form.re_enrollment_date).slice(0, 10)} onChange={(event) => change("re_enrollment_date", event.target.value)} /></Field>
        <Field label="Application date"><input type="date" value={textValue(form.application_date).slice(0, 10)} onChange={(event) => change("application_date", event.target.value)} /></Field>
        <Field label="iApplication expiration"><input type="date" value={textValue(form.app_review_expiration_date).slice(0, 10)} onChange={(event) => change("app_review_expiration_date", event.target.value)} /></Field>
        <Field label="Law test date"><input type="date" value={textValue(form.test_date_law).slice(0, 10)} onChange={(event) => change("test_date_law", event.target.value)} /></Field>
        <Field label="Trade test date"><input type="date" value={textValue(form.test_date_trade).slice(0, 10)} onChange={(event) => change("test_date_trade", event.target.value)} /></Field>
        <Field label="Internal notes" wide><textarea rows={4} value={textValue(form.Notes)} onChange={(event) => change("Notes", event.target.value)} /></Field>
      </div></section>
      <section className="student-section-card"><header><div><h2>Corporation information</h2><p>Linked company record from the legacy corporation workflow.</p></div><span className="section-number">03</span></header>{student.corporation ? <dl className="student-definition-grid">{Object.entries(student.corporation).filter(([, value]) => value !== null && value !== "").slice(0, 10).map(([key, value]) => <div key={key}><dt>{key.replaceAll("_", " ")}</dt><dd>{textValue(value)}</dd></div>)}</dl> : <div className="student-empty compact"><strong>No corporation linked.</strong><span>Corporation information will appear when a company record is attached.</span></div>}</section>
      <div className="student-sticky-actions"><span>{pending ? "Saving changes…" : "Changes are sent to contractor-api."}</span><button className="primary-button" type="submit" disabled={pending}>Save student</button></div>
    </form> : null}

    {tab === "enrollments" ? <div className="student-section-stack">
      <section className="student-section-card"><header><div><h2>Online courses</h2><p>Course access and expiration records.</p></div><span className="record-count">{student.online_courses.length}</span></header><RecordTable rows={student.online_courses} empty="No online courses" /></section>
      <section className="student-section-card"><header><div><h2>Live classes</h2><p>Current and historical live class access.</p></div><span className="record-count">{student.live_classes.length}</span></header><RecordTable rows={student.live_classes} empty="No live classes" /></section>
      <section className="student-section-card"><header><div><h2>Class schedule</h2><p>Law and trade dates managed by staff.</p></div><span className="record-count">{student.class_managements.length}</span></header><RecordTable rows={student.class_managements} empty="No scheduled classes" /></section>
      <section className="student-section-card"><header><div><h2>Subscribed tests</h2><p>Practice-test access and expiration.</p></div><span className="record-count">{student.subscribed_tests.length}</span></header><RecordTable rows={student.subscribed_tests} empty="No subscribed tests" /></section>
    </div> : null}

    {tab === "activity" ? <div className="student-section-stack">
      <section className="student-section-card"><header><div><h2>Documents</h2><p>Student files and application descriptions.</p></div><span className="record-count">{student.documents.length}</span></header><RecordTable rows={student.documents} empty="No student documents" /></section>
      <section className="student-section-card"><header><div><h2>Customer notes</h2><p>Notes for the current and previous email address.</p></div><span className="record-count">{student.notes.length}</span></header><RecordTable rows={student.notes} empty="No customer notes" /></section>
    </div> : null}

    {tab === "actions" ? <div className="student-action-grid">
      <section className="student-section-card"><header><div><h2>Reset password</h2><p>Set a temporary student password. The API hashes it before storage.</p></div></header><form className="stack-form" onSubmit={(event) => { event.preventDefault(); void run(() => updateStudentPassword(studentId, newPassword), "Student password updated.").then(() => setNewPassword("")); }}><Field label="New password"><input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field><button className="primary-button" type="submit" disabled={pending || newPassword.length < 8}>Update password</button></form></section>
      <section className="student-section-card"><header><div><h2>Send email</h2><p>Send a staff message and retain it in the student email history.</p></div></header><form className="stack-form" onSubmit={(event) => { event.preventDefault(); void run(() => sendStudentEmail(studentId, emailSubject, emailContent), "Student email queued.").then(() => { setEmailSubject(""); setEmailContent(""); }); }}><Field label="Subject"><input required value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} /></Field><Field label="Message"><textarea required rows={6} value={emailContent} onChange={(event) => setEmailContent(event.target.value)} /></Field><button className="primary-button" type="submit" disabled={pending}>Send email</button></form></section>
      <section className="student-section-card action-summary-card"><header><div><h2>Application access</h2><p>Current integration status for this customer.</p></div></header><dl className="student-definition-grid"><div><dt>iApplication access</dt><dd>{textValue(student.iapp_access) || "0"}</dd></div><div><dt>Apps account</dt><dd>{student.apps_account_created ? "Created" : "Not created"}</dd></div><div><dt>Prescreen choice</dt><dd>{student.prescreen_choice?.replaceAll("_", " ") || "Not selected"}</dd></div><div><dt>Spanish access</dt><dd>{Number(student.es_access) ? "Enabled" : "Not enabled"}</dd></div></dl><button className="secondary-button" type="button" disabled={pending} onClick={() => void run(() => copyStudentToPbia(studentId))}>Queue PBIA copy</button></section>
    </div> : null}
  </div>;
}
