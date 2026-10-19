"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { addStudentNote, downloadStudentDocument, removeStudentAccess, removeStudentDocument, saveStudentAccess, saveStudentPrescreen, sendStudentEmail, studentAccessOptions, studentEmailHistory, studentEmailTemplate, studentEmailTemplates, synchronizeStudent, uploadStudentDocument } from "../../lib/student-api";
import { StaffApiError } from "../../lib/staff-api";
import type { StudentAccessKind, StudentAccessOptions, StudentDocument, StudentEmailRecord, StudentRecordValue, StudentSyncResults } from "../../lib/students";

const errorMessage = (error: unknown) => error instanceof StaffApiError ? error.message : "The request could not be completed. Please try again.";
export function syncMessage(results?: StudentSyncResults) {
  return Object.entries(results ?? {}).map(([service, result]) => `${service.replaceAll("_", " ")}: ${result.status.replaceAll("_", " ")}`).join("; ");
}
function Input({ label, children }: { label: string; children: ReactNode }) {
  return <label className="student-field"><span>{label}</span>{children}</label>;
}
function Feedback({ error, notice }: { error: string; notice: string }) {
  return <>{error && <p className="student-error" role="alert">{error}</p>}{notice && <p className="student-success" role="status">{notice}</p>}</>;
}

export function StudentAccessPanel({ studentId, kind, title, rows, canManage, onChanged }: { studentId: number; kind: StudentAccessKind; title: string; rows: Array<Record<string, StudentRecordValue>>; canManage: boolean; onChanged: () => Promise<void> }) {
  const [options, setOptions] = useState<StudentAccessOptions | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const [values, setValues] = useState<Record<string, StudentRecordValue>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const schedule = kind === "class_managements";
  const foreign = { online_courses: "clas_id", live_classes: "live_class_category_id", subscribed_tests: "access_lev", class_managements: "sem_location" }[kind];
  const expiry = kind === "subscribed_tests" ? "expiration_date" : "end_enroll";
  useEffect(() => {
    if (!canManage) return;
    let active = true;
    studentAccessOptions(studentId).then(response => { if (active) setOptions(response.data); }).catch(error => { if (active) setError(errorMessage(error)); });
    return () => { active = false; };
  }, [studentId, canManage]);
  function change(field: string, value: StudentRecordValue) { setValues(current => ({ ...current, [field]: value })); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try { await saveStudentAccess(studentId, kind, values, editing || undefined); setEditing(null); await onChanged(); setNotice("Student access saved."); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  async function remove(id: number) {
    setBusy(true); setError(""); setNotice("");
    try { await removeStudentAccess(studentId, kind, id); setConfirm(null); await onChanged(); setNotice("Student access removed."); }
    catch (error) { setError(errorMessage(error)); } finally { setBusy(false); }
  }
  return <section className="student-section-card"><header><div><h2>{title}</h2><p>{rows.length} records · changes update the source system.</p></div>{canManage && <button type="button" className="secondary-button" disabled={busy || !options} onClick={() => { setValues(schedule ? { sem_location: "", law_date: "", trade_date: "", confirmed: 0, pl_confirmed: 0 } : { [foreign]: "", [expiry]: "", status: 1 }); setEditing(0); }}>Add {title.toLowerCase()}</button>}</header>
    <Feedback error={error} notice={notice} />
    {!rows.length && <p className="student-empty compact">No records.</p>}
    {rows.length > 0 && <div className="student-table-scroll"><table className="student-table"><thead><tr><th>Course / location</th><th>{schedule ? "Law / trade dates" : "Expires"}</th><th>Status</th>{canManage && <th>Actions</th>}</tr></thead><tbody>{rows.map(row => <tr key={String(row.id)}><td>{String(row.label ?? row.sem_location ?? row[foreign] ?? "—")}</td><td>{schedule ? `${row.law_date || "—"} / ${row.trade_date || "—"}` : String(row[expiry] || "—")}</td><td>{schedule ? (Number(row.confirmed) ? "Confirmed" : "Not confirmed") : (Number(row.status) ? "Active" : "Inactive")}</td>{canManage && <td>{confirm === Number(row.id) ? <><span>Remove this record? </span><button type="button" disabled={busy} onClick={() => void remove(Number(row.id))}>Confirm removal</button><button type="button" disabled={busy} onClick={() => setConfirm(null)}>Cancel</button></> : <><button type="button" disabled={busy || Boolean(row.legacy_spanish)} onClick={() => { setEditing(Number(row.id)); setValues(row); }}>Edit</button><button type="button" disabled={busy} onClick={() => setConfirm(Number(row.id))}>Remove</button></>}</td>}</tr>)}</tbody></table></div>}
    {editing !== null && <form className="stack-form student-record-editor" onSubmit={save}><h3>{editing ? "Edit" : "Add"} {title.toLowerCase()}</h3><Input label={schedule ? "Location" : "Classification / course"}><select required value={String(values[foreign] ?? "")} onChange={event => change(foreign, schedule ? event.target.value : Number(event.target.value))}><option value="">Choose…</option>{options?.[kind].map(option => <option key={option.id} value={schedule ? option.label : option.id}>{option.label}</option>)}</select></Input>
      {schedule ? <><Input label="Law class date"><input type="date" value={String(values.law_date ?? "")} onChange={event => change("law_date", event.target.value)} /></Input><Input label="Trade class date"><input type="date" value={String(values.trade_date ?? "")} onChange={event => change("trade_date", event.target.value)} /></Input><Input label="Attendance confirmation"><select value={Number(values.confirmed)} onChange={event => change("confirmed", Number(event.target.value))}><option value="0">Not confirmed</option><option value="1">Confirmed</option></select></Input><Input label="Law confirmation"><select value={Number(values.pl_confirmed)} onChange={event => change("pl_confirmed", Number(event.target.value))}><option value="0">Not confirmed</option><option value="1">Confirmed</option></select></Input></> : <><Input label="Expiration date"><input required type="date" value={String(values[expiry] ?? "")} onChange={event => change(expiry, event.target.value)} /></Input><Input label="Status"><select value={Number(values.status)} onChange={event => change("status", Number(event.target.value))}><option value="1">Active</option><option value="0">Inactive</option></select></Input></>}
      <div><button className="primary-button" disabled={busy} type="submit">Save access</button><button className="secondary-button" disabled={busy} type="button" onClick={() => setEditing(null)}>Cancel</button></div></form>}
  </section>;
}

export function StudentDocuments({ studentId, documents, canManage, onChanged }: { studentId: number; documents: StudentDocument[]; canManage: boolean; onChanged: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const uploadForm = useRef<HTMLFormElement>(null);
  async function act(work: () => Promise<void>) { setBusy(true); setError(""); setNotice(""); try { await work(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); } }
  async function download(document: StudentDocument) {
    const url = URL.createObjectURL(await downloadStudentDocument(studentId, document));
    const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = document.name; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="student-section-card"><header><div><h2>Documents</h2><p>Private attachments and application uploads. PDF, JPG, PNG · maximum 10 MB.</p></div></header><Feedback error={error} notice={notice} />
    {!documents.length && <p className="student-empty compact">No student documents.</p>}
    <ul className="student-record-list">{documents.map(document => { const key = `${document.kind}-${document.id}`; return <li key={key}><strong>{document.description || document.name}</strong><small>{document.kind} · {document.date || "Date unavailable"} · {document.admin || "Staff"}</small><button type="button" disabled={busy} onClick={() => void act(() => download(document))}>Download</button>{canManage && (confirm === key ? <><span>Remove document? A private recovery copy is retained.</span><button type="button" disabled={busy} onClick={() => void act(async () => { const result = await removeStudentDocument(studentId, document); setConfirm(null); await onChanged(); setNotice(result.message); })}>Confirm removal</button><button type="button" onClick={() => setConfirm(null)}>Cancel</button></> : <button type="button" disabled={busy} onClick={() => setConfirm(key)}>Remove</button>)}</li>; })}</ul>
    {canManage && <form className="stack-form" ref={uploadForm} onSubmit={event => { event.preventDefault(); if (!file) return; void act(async () => { await uploadStudentDocument(studentId, file, description); setFile(null); setDescription(""); uploadForm.current?.reset(); await onChanged(); setNotice("Encrypted document uploaded."); }); }}><Input label="Document"><input type="file" required accept="application/pdf,image/jpeg,image/png" onChange={event => setFile(event.target.files?.[0] ?? null)} /></Input><Input label="Description"><input maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></Input><button className="primary-button" type="submit" disabled={busy || !file}>Upload document</button></form>}
  </section>;
}

export function StudentNoteForm({ studentId, onChanged }: { studentId: number; onChanged: () => Promise<void> }) {
  const [note, setNote] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  return <form className="stack-form" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { await addStudentNote(studentId, note); setNote(""); await onChanged(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); } }}><Feedback error={error} notice="" /><Input label="Add customer note"><textarea required maxLength={10000} rows={3} value={note} onChange={event => setNote(event.target.value)} /></Input><button className="primary-button" disabled={busy || !note.trim()} type="submit">Save attributed note</button></form>;
}

export function StudentCommunication({ studentId, canManage }: { studentId: number; canManage: boolean }) {
  const [history, setHistory] = useState<StudentEmailRecord[]>([]); const [loaded, setLoaded] = useState(false);
  const [subject, setSubject] = useState(""); const [content, setContent] = useState(""); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [templates, setTemplates] = useState<Array<{ id: number; title: string }>>([]);
  const [template, setTemplate] = useState("");
  useEffect(() => { if (!canManage) return; let active = true; studentEmailTemplates(studentId).then(response => { if (active) setTemplates(response.data.items); }).catch(error => { if (active) setError(errorMessage(error)); }); return () => { active = false; }; }, [studentId, canManage]);
  async function loadTemplate(value: string) { setTemplate(value); if (!value) return; setBusy(true); setError(""); try { const result = await studentEmailTemplate(studentId, Number(value)); setSubject(result.data.subject); setContent(result.data.content); setRequestKey(null); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); } }
  const [requestKey, setRequestKey] = useState<string | null>(null);
  useEffect(() => { let active = true; studentEmailHistory(studentId).then(response => { if (active) { setHistory(response.data.items); setLoaded(true); } }).catch(error => { if (active) setError(errorMessage(error)); }); return () => { active = false; }; }, [studentId]);
  async function send(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice(""); const key = requestKey ?? crypto.randomUUID(); setRequestKey(key);
    try { await sendStudentEmail(studentId, subject, content, key, template ? Number(template) : undefined); setSubject(""); setContent(""); setTemplate(""); setRequestKey(null); setNotice("Email accepted by the mail provider."); }
    catch (error) { setError(errorMessage(error)); }
    finally { try { setHistory((await studentEmailHistory(studentId)).data.items); setLoaded(true); } catch { setNotice("Email history could not refresh. Reopen this section before retrying delivery."); } setBusy(false); }
  }
  return <section className="student-section-card"><header><div><h2>Email & history</h2><p>Messages are recorded with delivery status. Provider acceptance does not guarantee inbox delivery.</p></div></header><Feedback error={error} notice={notice} />
    {canManage && <form className="stack-form" onSubmit={send}><Input label="Your email templates"><select disabled={busy} value={template} onChange={event => void loadTemplate(event.target.value)}><option value="">Compose a message</option>{templates.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Input><Input label="Subject"><input required disabled={busy} maxLength={255} value={subject} onChange={event => { setRequestKey(null); setSubject(event.target.value); }} /></Input><Input label="Message"><textarea required disabled={busy} rows={6} maxLength={50000} value={content} onChange={event => { setRequestKey(null); setContent(event.target.value); }} /></Input><p>Supports {"{firstname}"}, {"{lastname}"}, and {"{classification}"}. Your staff signature is appended.</p><button className="primary-button" disabled={busy} type="submit">{busy ? "Working…" : "Send email"}</button>{requestKey && !busy && <button className="secondary-button" type="button" onClick={() => { setRequestKey(null); setNotice("A new delivery attempt will be used. Review history to avoid duplicate email."); }}>Start a new delivery attempt</button>}</form>}
    <h3>Recent message history (up to 100)</h3>{!loaded ? <p role="status">History not yet loaded.</p> : !history.length ? <p>No recorded emails.</p> : <ul className="student-record-list">{history.map(message => <li key={message.id}><details><summary>{message.subject || "Untitled message"} · {message.delivery_status} · {message.created_at}</summary><p>{message.admin}</p><pre className="student-message-content">{message.content}</pre></details></li>)}</ul>}
  </section>;
}

export function StudentApplicationTools({ studentId, canManage, onChanged, prescreenChoice }: { studentId: number; canManage: boolean; onChanged: () => Promise<void>; prescreenChoice?: string | null }) {
  const [license, setLicense] = useState<"yes" | "no">(prescreenChoice === "ADDITIONAL_CLASSIFICATION" ? "yes" : "no"); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  async function act(prescreen: boolean) { setBusy(true); setError(""); setNotice(""); try { const result = prescreen ? (await saveStudentPrescreen(studentId, license)).meta.synchronization : (await synchronizeStudent(studentId)).data; setNotice(syncMessage(result) || "No synchronization changes."); await onChanged(); } catch (error) { setError(errorMessage(error)); } finally { setBusy(false); } }
  return <><Feedback error={error} notice={notice} />{canManage && <div className="stack-form"><Input label="Does the student already hold a contractor license?"><select value={license} onChange={event => setLicense(event.target.value as "yes" | "no")}><option value="no">No — original license packet</option><option value="yes">Yes — additional classification packet</option></select></Input><button className="primary-button" type="button" disabled={busy} onClick={() => void act(true)}>Save prescreen & synchronize account</button><button className="secondary-button" type="button" disabled={busy} onClick={() => void act(false)}>Retry saved application synchronization</button><p>External writes require explicitly configured development integration hosts. Disabled or unconfigured integrations are shown here.</p></div>}</>;
}
