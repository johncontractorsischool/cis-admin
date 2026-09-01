"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  brochureExportUrl,
  createBrochure,
  createBrochureTemplate,
  deleteBrochureTemplate,
  getBrochure,
  getBrochureEmailHistory,
  getBrochureOptions,
  listBrochures,
  listBrochureTemplates,
  moveBrochureCallbacks,
  resolveBrochureTemplate,
  sendBrochureEmail,
  testBrochureTemplate,
  toggleBrochureStatus,
  updateBrochure,
  updateBrochureTemplate,
  type BrochureFilters,
} from "../../lib/brochure-api";
import type {
  BrochureEmailHistory,
  BrochureInput,
  BrochureOptions,
  BrochurePagination,
  BrochureRecord,
  BrochureTemplate,
  BrochureTemplateInput,
  BrochureView,
} from "../../lib/brochures";
import { StaffApiError } from "../../lib/staff-api";
import type { StaffPrincipal } from "../../lib/staff";

const emptyPagination: BrochurePagination = { current_page: 1, per_page: 25, total: 0, last_page: 1 };
const emptyOptions: BrochureOptions = { admins: [], ad_sources: [], classifications: [] };
const today = () => new Date().toISOString().slice(0, 10);
const emptyBrochure = (): BrochureInput => ({ First_Name: "", Last_Name: "", Address: "", City: "", State: "CA", Zip: "", Email: "", Phone: "", phone_extension: "", Notes: "", memo: "", Ad: "", ad_other: "", Classification: "", do_not_mail: false, Followup_date: "", letter_date: "", admin_id: null, language: "en" });
const emptyTemplate = (): BrochureTemplateInput => ({ title: "", subject: "", content: "", status: true });

function message(caught: unknown) { return caught instanceof StaffApiError ? caught.message : "The brochure service is temporarily unavailable."; }
function toIsoDate(value: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}` : "";
}
function recordInput(record: BrochureRecord): BrochureInput {
  return { First_Name: record.first_name, Last_Name: record.last_name, Address: record.address ?? "", City: record.city ?? "", State: record.state ?? "", Zip: record.zip ?? "", Email: record.email, Phone: record.phone ?? "", phone_extension: record.phone_extension ?? "", Notes: "", memo: record.memo ?? "", Ad: record.ad ?? "", ad_other: record.ad_other ?? "", Classification: record.classification ?? "", do_not_mail: record.do_not_mail, Orig_Date: toIsoDate(record.orig_date), Followup_date: toIsoDate(record.followup_date), letter_date: toIsoDate(record.letter_date), admin_id: record.admin_id, language: record.language ?? "en" };
}

export const brochureLinks: { view: Exclude<BrochureView, "detail">; label: string; href: string }[] = [
  { view: "new", label: "New Brochures", href: "/staff/brochures/new" },
  { view: "followups", label: "Today’s Followups", href: "/staff/brochures/followups" },
  { view: "request", label: "Request Brochure", href: "/staff/brochures/request" },
  { view: "search", label: "Search Brochures", href: "/staff/brochures/search" },
  { view: "templates", label: "Manage Templates", href: "/staff/brochure-templates" },
];

function BrochureSectionNav({ view }: { view: BrochureView }) {
  return <nav className="brochure-section-nav" aria-label="Brochure workspace">{brochureLinks.map((item) => <Link key={item.view} href={item.href} className={view === item.view ? "active" : ""}>{item.label}</Link>)}</nav>;
}

function WorkspaceHeader({ view, title, copy }: { view: BrochureView; title: string; copy: string }) {
  return <><header className="student-page-header brochure-page-header"><div><p className="eyebrow">Lead follow-up</p><h1>{title}</h1><p>{copy}</p></div><span className="brochure-header-mark" aria-hidden="true">BR</span></header><BrochureSectionNav view={view} /></>;
}

function BrochureFields({ value, options, onChange, includeDates = true }: { value: BrochureInput; options: BrochureOptions; onChange: (field: keyof BrochureInput, value: string | number | boolean | null) => void; includeDates?: boolean }) {
  return <div className="brochure-form-grid">
    <section className="brochure-form-section"><header><span>01</span><div><strong>Personal details</strong><small>Lead identity and mailing address</small></div></header><div className="brochure-fields">
      <label className="student-field"><span>First name</span><input required value={value.First_Name} onChange={(event) => onChange("First_Name", event.target.value)} /></label>
      <label className="student-field"><span>Last name</span><input required value={value.Last_Name} onChange={(event) => onChange("Last_Name", event.target.value)} /></label>
      <label className="student-field brochure-span-2"><span>Address</span><input value={value.Address} onChange={(event) => onChange("Address", event.target.value)} /></label>
      <label className="student-field"><span>City</span><input value={value.City} onChange={(event) => onChange("City", event.target.value)} /></label>
      <label className="student-field"><span>State</span><input maxLength={2} value={value.State} onChange={(event) => onChange("State", event.target.value.toUpperCase())} /></label>
      <label className="student-field"><span>ZIP</span><input value={value.Zip} onChange={(event) => onChange("Zip", event.target.value)} /></label>
    </div></section>
    <section className="brochure-form-section"><header><span>02</span><div><strong>Contact & interest</strong><small>How to reach and help this lead</small></div></header><div className="brochure-fields">
      <label className="student-field brochure-span-2"><span>Email</span><input type="email" required value={value.Email} onChange={(event) => onChange("Email", event.target.value)} /></label>
      <label className="student-field"><span>Phone</span><input type="tel" value={value.Phone} onChange={(event) => onChange("Phone", event.target.value)} /></label>
      <label className="student-field"><span>Extension</span><input inputMode="numeric" maxLength={5} value={value.phone_extension} onChange={(event) => onChange("phone_extension", event.target.value.replace(/\D/g, ""))} /></label>
      <label className="student-field brochure-span-2"><span>Desired classification</span><select value={value.Classification} onChange={(event) => onChange("Classification", event.target.value)}><option value="">Classification (optional)</option>{options.classifications.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></label>
      <label className="student-field"><span>Source</span><select value={value.Ad} onChange={(event) => onChange("Ad", event.target.value)}><option value="">Please select</option>{options.ad_sources.map((source) => <option key={source}>{source}</option>)}</select></label>
      {value.Ad === "Other" ? <label className="student-field"><span>Other source</span><input value={value.ad_other} onChange={(event) => onChange("ad_other", event.target.value)} /></label> : null}
      <label className="student-field"><span>Language</span><select value={value.language} onChange={(event) => onChange("language", event.target.value)}><option value="en">English</option><option value="es">Spanish</option></select></label>
    </div></section>
    <section className="brochure-form-section brochure-form-section-wide"><header><span>03</span><div><strong>Follow-up details</strong><small>Ownership, timing, and staff notes</small></div></header><div className="brochure-fields brochure-followup-fields">
      <label className="student-field"><span>Assigned admin</span><select value={value.admin_id ?? ""} onChange={(event) => onChange("admin_id", event.target.value ? Number(event.target.value) : null)}><option value="">Current staff member</option><optgroup label="Active">{options.admins.filter((admin) => admin.active).map((admin) => <option key={admin.id} value={admin.id}>{admin.name} (#{admin.id})</option>)}</optgroup><optgroup label="Inactive">{options.admins.filter((admin) => !admin.active).map((admin) => <option key={admin.id} value={admin.id}>{admin.name} (#{admin.id})</option>)}</optgroup></select></label>
      {includeDates ? <><label className="student-field"><span>Follow-up date</span><input type="date" value={value.Followup_date} onChange={(event) => onChange("Followup_date", event.target.value)} /></label><label className="student-field"><span>Letter date</span><input type="date" value={value.letter_date} onChange={(event) => onChange("letter_date", event.target.value)} /></label></> : null}
      <label className="student-field brochure-span-2"><span>Memo</span><input value={value.memo} onChange={(event) => onChange("memo", event.target.value)} placeholder="Short note shown in the list" /></label>
      <label className="student-field brochure-notes-field"><span>New note</span><textarea value={value.Notes} onChange={(event) => onChange("Notes", event.target.value)} placeholder="Add a note for the next staff member" /></label>
      <label className="brochure-check-field" aria-label="Don’t send physical mail"><input type="checkbox" checked={Boolean(value.do_not_mail)} onChange={(event) => onChange("do_not_mail", event.target.checked)} /><span><strong>Don’t send physical mail</strong><small>Keep the lead active for calls and email.</small></span></label>
    </div></section>
  </div>;
}

function RequestBrochure() {
  const [options, setOptions] = useState(emptyOptions);
  const [form, setForm] = useState<BrochureInput>(emptyBrochure);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { getBrochureOptions().then((response) => setOptions(response.data)).catch((caught) => setError(message(caught))); }, []);
  function change(field: keyof BrochureInput, value: string | number | boolean | null) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event: FormEvent) { event.preventDefault(); setPending(true); setError(""); setNotice(""); try { const response = await createBrochure(form); setNotice(`Brochure #${response.data.id} was requested for ${response.data.full_name}.`); setForm(emptyBrochure()); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  return <div className="student-workspace brochure-workspace"><WorkspaceHeader view="request" title="Request Brochure" copy="Capture a new lead, assign the follow-up, and prepare the brochure workflow in one place." />{error ? <div className="student-error" role="alert">{error}</div> : null}{notice ? <div className="student-success" role="status"><strong>Request saved.</strong><span>{notice}</span></div> : null}<form className="brochure-request-form" onSubmit={submit}><BrochureFields value={form} options={options} onChange={change} includeDates={false} /><footer className="brochure-form-actions"><Link className="secondary-button" href="/staff/brochures/new">Cancel</Link><button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving request…" : "Request brochure"}</button></footer></form></div>;
}

function BrochureList({ view, principal }: { view: "new" | "followups" | "search"; principal: StaffPrincipal }) {
  const [options, setOptions] = useState(emptyOptions);
  const initialFilters = useMemo<BrochureFilters>(() => view === "new" ? { type: "new", status: "active", page: 1 } : view === "followups" ? { type: "today", status: "active", followupDate: today(), adminId: principal.id, page: 1 } : { type: "all", status: "active", page: 1 }, [principal.id, view]);
  const [filters, setFilters] = useState<BrochureFilters>(initialFilters);
  const [draft, setDraft] = useState<BrochureFilters>(initialFilters);
  const [items, setItems] = useState<BrochureRecord[]>([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveAdmin, setMoveAdmin] = useState<number>(principal.id);
  const [moveDate, setMoveDate] = useState(today());
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refresh, setRefresh] = useState(0);
  useEffect(() => { getBrochureOptions().then((response) => setOptions(response.data)).catch((caught) => setError(message(caught))); }, []);
  useEffect(() => { let active = true; listBrochures({ ...filters, perPage: 25 }).then((response) => { if (!active) return; setItems(response.data.items); setPagination(response.meta.pagination); setSelected(new Set()); }).catch((caught) => { if (active) setError(message(caught)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [filters, refresh]);
  function apply(event: FormEvent) { event.preventDefault(); setFilters({ ...draft, page: 1 }); }
  function toggle(id: number) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleAll() { setSelected((current) => current.size === items.length ? new Set() : new Set(items.map((item) => item.id))); }
  async function status(item: BrochureRecord) { setPending(true); setError(""); try { const response = await toggleBrochureStatus(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? response.data : entry).filter((entry) => filters.status === "all" || entry.is_active === (filters.status !== "archived"))); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  async function move() { if (!selected.size || !moveAdmin || !moveDate) return; setPending(true); setError(""); try { const response = await moveBrochureCallbacks([...selected], moveDate, moveAdmin); setMoveOpen(false); setNotice(`${response.data.updated} selected ${response.data.updated === 1 ? "callback was" : "callbacks were"} reassigned.`); setRefresh((value) => value + 1); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  const title = view === "new" ? "New Brochures" : view === "followups" ? "Today’s Followups" : "Search Brochures";
  const copy = view === "new" ? "Work new brochure requests before the first letter is sent." : view === "followups" ? "Keep today’s assigned calls moving and reschedule selected callbacks together." : "Find active or archived brochure leads by contact, date, owner, or status.";
  return <div className="student-workspace brochure-workspace"><WorkspaceHeader view={view} title={title} copy={copy} />
    <form className={`brochure-filter-card ${view === "search" ? "advanced" : ""}`} onSubmit={apply}>
      {view === "search" ? <><label className="student-field"><span>First name</span><input value={draft.firstName ?? ""} onChange={(event) => setDraft((current) => ({ ...current, firstName: event.target.value }))} /></label><label className="student-field"><span>Last name</span><input value={draft.lastName ?? ""} onChange={(event) => setDraft((current) => ({ ...current, lastName: event.target.value }))} /></label><label className="student-field"><span>Phone</span><input value={draft.phone ?? ""} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} /></label><label className="student-field"><span>Email</span><input type="email" value={draft.email ?? ""} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} /></label><label className="student-field"><span>Follow-up date</span><input type="date" value={draft.followupDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, followupDate: event.target.value }))} /></label><label className="student-field"><span>Letter date</span><input type="date" value={draft.letterDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, letterDate: event.target.value }))} /></label></> : <label className="student-field brochure-keyword-field"><span>Search this queue</span><input value={draft.search ?? ""} onChange={(event) => setDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Name, phone, or email" /></label>}
      {view === "followups" ? <><label className="student-field"><span>Follow-up date</span><input type="date" value={draft.followupDate ?? ""} onChange={(event) => setDraft((current) => ({ ...current, followupDate: event.target.value }))} /></label><label className="student-field"><span>Admin</span><select value={draft.adminId ?? ""} onChange={(event) => setDraft((current) => ({ ...current, adminId: event.target.value ? Number(event.target.value) : undefined }))}><option value="">All admins</option>{options.admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label></> : null}
      {view === "search" ? <label className="student-field"><span>Status</span><select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as BrochureFilters["status"] }))}><option value="active">Active</option><option value="archived">Archived</option><option value="all">All</option></select></label> : null}
      <div className="brochure-filter-actions"><button className="primary-button" type="submit">{view === "search" ? "Search" : "Apply"}</button><button className="secondary-button" type="button" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); }}>Reset</button></div>
    </form>
    {error ? <div className="student-error" role="alert"><strong>Brochures unavailable.</strong><span>{error}</span></div> : null}{notice ? <div className="student-success" role="status"><strong>Done.</strong><span>{notice}</span></div> : null}
    <section className="student-list-card brochure-list-card"><header className="student-list-head"><div><h2>{title}</h2><p>{loading ? "Loading brochure records…" : `${pagination.total.toLocaleString()} ${pagination.total === 1 ? "record" : "records"}`}</p></div><div className="brochure-list-tools"><span>{selected.size ? `${selected.size} selected` : "Select records for callback actions"}</span><button className="secondary-button" type="button" disabled={!selected.size} onClick={() => setMoveOpen(true)}>Move callbacks</button><a className="secondary-button" href={brochureExportUrl(filters)}>Export CSV</a></div></header>
      {loading ? <div className="student-loading">Loading brochures…</div> : null}{!loading && !items.length ? <div className="student-empty"><strong>No brochures match this view.</strong><span>Adjust the filters or create a new brochure request.</span><Link className="secondary-button" href="/staff/brochures/request">Request brochure</Link></div> : null}
      {!loading && items.length ? <div className="student-table-scroll"><table className="student-table brochure-table"><thead><tr><th><input type="checkbox" aria-label="Select all visible brochures" checked={selected.size === items.length} onChange={toggleAll} /></th><th>ID</th><th>Name</th><th>Phone</th><th>Email</th><th>Admin / follow-up</th><th>Memo</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={!item.is_active ? "archived" : ""}><td><input type="checkbox" aria-label={`Select brochure ${item.id}`} checked={selected.has(item.id)} onChange={() => toggle(item.id)} /></td><td><strong>#{item.id}</strong></td><td><span className="table-stack"><strong>{item.full_name}</strong><small>{item.classification || "No classification"}</small></span></td><td><span className="table-stack"><strong>{item.phone || "—"}</strong><small>{item.phone_extension ? `ext. ${item.phone_extension}` : "No extension"}</small></span></td><td><a className="device-email" href={`mailto:${item.email}`}>{item.email}</a></td><td><span className="table-stack"><strong>{item.admin || "Unassigned"}</strong><small>{item.followup_date || "No follow-up date"}</small></span></td><td>{item.memo || "—"}</td><td><div className="brochure-row-actions"><Link href={`/staff/brochures/${item.id}`}>View</Link><Link href={`/staff/students/new?email=${encodeURIComponent(item.email)}`}>Enroll</Link><button type="button" disabled={pending} className={item.is_active ? "archive" : "activate"} onClick={() => void status(item)}>{item.is_active ? "Archive" : "Activate"}</button></div></td></tr>)}</tbody></table></div> : null}
      {pagination.last_page > 1 ? <footer className="student-pagination"><span>Page {pagination.current_page} of {pagination.last_page}</span><div><button className="secondary-button" type="button" disabled={pagination.current_page <= 1} onClick={() => setFilters((current) => ({ ...current, page: pagination.current_page - 1 }))}>Previous</button><button className="secondary-button" type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => setFilters((current) => ({ ...current, page: pagination.current_page + 1 }))}>Next</button></div></footer> : null}
    </section>
    {moveOpen ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close callback reassignment" onClick={() => setMoveOpen(false)} /><section className="modal-card brochure-move-modal" role="dialog" aria-modal="true" aria-labelledby="move-callback-title"><header className="modal-head"><div><p className="eyebrow">Bulk action</p><h2 id="move-callback-title">Move {selected.size} selected {selected.size === 1 ? "callback" : "callbacks"}</h2></div><button className="modal-close" type="button" aria-label="Close" onClick={() => setMoveOpen(false)}>×</button></header><div className="brochure-modal-fields"><label className="student-field"><span>Assigned admin</span><select value={moveAdmin} onChange={(event) => setMoveAdmin(Number(event.target.value))}>{options.admins.map((admin) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}</select></label><label className="student-field"><span>New follow-up date</span><input type="date" value={moveDate} onChange={(event) => setMoveDate(event.target.value)} /></label></div><footer className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setMoveOpen(false)}>Cancel</button><button className="primary-button" type="button" disabled={pending} onClick={() => void move()}>{pending ? "Moving…" : "Move callbacks"}</button></footer></section></div> : null}
  </div>;
}

function BrochureDetail({ brochureId }: { brochureId: number }) {
  const [record, setRecord] = useState<BrochureRecord | null>(null);
  const [form, setForm] = useState<BrochureInput>(emptyBrochure);
  const [options, setOptions] = useState(emptyOptions);
  const [templates, setTemplates] = useState<BrochureTemplate[]>([]);
  const [history, setHistory] = useState<BrochureEmailHistory[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { Promise.all([getBrochure(brochureId), listBrochureTemplates(), getBrochureEmailHistory(brochureId)]).then(([detail, templateResponse, historyResponse]) => { setRecord(detail.data.brochure); setForm(recordInput(detail.data.brochure)); setOptions(detail.data.options); setTemplates(templateResponse.data.items); setHistory(historyResponse.data.items); }).catch((caught) => setError(message(caught))); }, [brochureId]);
  function change(field: keyof BrochureInput, value: string | number | boolean | null) { setForm((current) => ({ ...current, [field]: value })); }
  async function save(event: FormEvent) { event.preventDefault(); setPending(true); setError(""); try { const response = await updateBrochure(brochureId, form); setRecord(response.data); setForm(recordInput(response.data)); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  async function status() { if (!record) return; setPending(true); try { const response = await toggleBrochureStatus(record.id); setRecord(response.data); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  async function chooseTemplate(value: string) { const id = value ? Number(value) : null; setTemplateId(id); if (!id) { setEmailSubject(""); setEmailContent(""); return; } try { const response = await resolveBrochureTemplate(id, brochureId); setEmailSubject(response.data.subject); setEmailContent(response.data.content); } catch (caught) { setError(message(caught)); } }
  async function sendEmail(event: FormEvent) { event.preventDefault(); setPending(true); try { const response = await sendBrochureEmail(brochureId, { email_template_id: templateId ?? undefined, email_subject: emailSubject, email_content: emailContent }); setNotice(response.message); setEmailOpen(false); const refreshed = await getBrochureEmailHistory(brochureId); setHistory(refreshed.data.items); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  if (!record) return <div className="student-workspace brochure-workspace"><WorkspaceHeader view="detail" title="Brochure details" copy="Loading the brochure record and communication history." />{error ? <div className="student-error" role="alert">{error}</div> : <div className="student-loading">Loading brochure details…</div>}</div>;
  return <div className="student-workspace brochure-workspace"><WorkspaceHeader view="detail" title={record.full_name} copy={`Brochure #${record.id} · ${record.is_active ? "Active" : "Archived"} · ${record.classification || "Classification not selected"}`} />{error ? <div className="student-error" role="alert">{error}</div> : null}{notice ? <div className="student-success" role="status">{notice}</div> : null}<div className="brochure-detail-toolbar"><Link className="secondary-button" href="/staff/brochures/followups">← Back to follow-ups</Link><button className="secondary-button" type="button" onClick={() => setEmailOpen(true)}>Send email</button><button className="secondary-button" type="button" onClick={() => setHistoryOpen(true)} disabled={!history.length}>Email history ({history.length})</button><button className={record.is_active ? "danger-button" : "primary-button"} type="button" onClick={() => void status()}>{record.is_active ? "Archive brochure" : "Activate brochure"}</button></div><form className="brochure-request-form" onSubmit={save}><BrochureFields value={form} options={options} onChange={change} /><footer className="brochure-form-actions"><button className="primary-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Update brochure"}</button></footer></form>
    {emailOpen ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close email composer" onClick={() => setEmailOpen(false)} /><section className="modal-card brochure-email-modal" role="dialog" aria-modal="true" aria-labelledby="brochure-email-title"><header className="modal-head"><div><p className="eyebrow">To {record.email}</p><h2 id="brochure-email-title">Send brochure email</h2></div><button className="modal-close" type="button" onClick={() => setEmailOpen(false)} aria-label="Close">×</button></header><form onSubmit={sendEmail}><div className="brochure-modal-fields"><label className="student-field"><span>Template</span><select value={templateId ?? ""} onChange={(event) => void chooseTemplate(event.target.value)}><option value="">Write without a template</option>{templates.filter((template) => template.status).map((template) => <option key={template.id} value={template.id}>{template.title}</option>)}</select></label><label className="student-field"><span>Subject</span><input required value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} /></label><label className="student-field brochure-email-content"><span>Message</span><textarea required value={emailContent} onChange={(event) => setEmailContent(event.target.value)} /></label></div><footer className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setEmailOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send email"}</button></footer></form></section></div> : null}
    {historyOpen ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close email history" onClick={() => setHistoryOpen(false)} /><section className="modal-card brochure-history-modal" role="dialog" aria-modal="true" aria-labelledby="brochure-history-title"><header className="modal-head"><div><p className="eyebrow">Brochure #{record.id}</p><h2 id="brochure-history-title">Email history</h2></div><button className="modal-close" type="button" onClick={() => setHistoryOpen(false)} aria-label="Close">×</button></header><div className="brochure-history-list">{history.map((item) => { const content = typeof item.email_content === "object" && item.email_content ? item.email_content : {}; return <article key={item.id}><header><strong>{content.subject || "Brochure email"}</strong><time>{item.created_at ? new Date(item.created_at).toLocaleString() : "Date unavailable"}</time></header><p>{content.content || String(item.email_content ?? "")}</p></article>; })}</div></section></div> : null}
  </div>;
}

function TemplateManager() {
  const [items, setItems] = useState<BrochureTemplate[]>([]);
  const [editing, setEditing] = useState<BrochureTemplate | null>(null);
  const [form, setForm] = useState<BrochureTemplateInput>(emptyTemplate);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testId, setTestId] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { listBrochureTemplates().then((response) => setItems(response.data.items)).catch((caught) => setError(message(caught))); }, []);
  function start(template?: BrochureTemplate) { setEditing(template ?? null); setForm(template ? { title: template.title, subject: template.subject, content: template.content, status: template.status } : emptyTemplate()); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); setPending(true); try { const response = editing ? await updateBrochureTemplate(editing.id, form) : await createBrochureTemplate(form); setItems((current) => editing ? current.map((item) => item.id === editing.id ? response.data : item) : [...current, response.data].sort((a, b) => a.title.localeCompare(b.title))); setOpen(false); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  async function remove() { if (!deleteId) return; setPending(true); try { const response = await deleteBrochureTemplate(deleteId); setItems((current) => current.filter((item) => item.id !== deleteId)); setDeleteId(null); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  async function test(event: FormEvent) { event.preventDefault(); if (!testId) return; setPending(true); try { const response = await testBrochureTemplate(testId, testEmail); setTestId(null); setTestEmail(""); setNotice(response.message); } catch (caught) { setError(message(caught)); } finally { setPending(false); } }
  return <div className="student-workspace brochure-workspace"><WorkspaceHeader view="templates" title="Manage Templates" copy="Create reusable brochure emails with first-name, last-name, and classification merge fields." />{error ? <div className="student-error" role="alert">{error}</div> : null}{notice ? <div className="student-success" role="status">{notice}</div> : null}<section className="student-list-card template-list-card"><header className="student-list-head"><div><h2>Email templates</h2><p>{items.length} saved {items.length === 1 ? "template" : "templates"}</p></div><button className="primary-button" type="button" onClick={() => start()}>New template</button></header>{!items.length ? <div className="student-empty"><strong>No templates yet.</strong><span>Create the first reusable brochure follow-up.</span></div> : <div className="template-grid">{items.map((item) => <article key={item.id}><header><span className={`template-status ${item.status ? "active" : "inactive"}`}>{item.status ? "Active" : "Inactive"}</span><strong>{item.title}</strong><small>{item.subject}</small></header><p>{item.content.replace(/<[^>]+>/g, " ").slice(0, 180)}</p><footer><button type="button" onClick={() => setTestId(item.id)}>Test email</button><button type="button" onClick={() => start(item)}>Edit</button><button className="delete" type="button" onClick={() => setDeleteId(item.id)}>Delete</button></footer></article>)}</div>}</section>
    {open ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close template editor" onClick={() => setOpen(false)} /><section className="modal-card brochure-template-modal" role="dialog" aria-modal="true" aria-labelledby="template-title"><header className="modal-head"><div><p className="eyebrow">Email content</p><h2 id="template-title">{editing ? "Edit template" : "New template"}</h2></div><button className="modal-close" type="button" onClick={() => setOpen(false)} aria-label="Close">×</button></header><form onSubmit={save}><div className="brochure-modal-fields"><label className="student-field"><span>Title</span><input required maxLength={100} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></label><label className="student-field"><span>Subject</span><input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></label><label className="student-field brochure-email-content"><span>Content</span><textarea required value={form.content} onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))} /></label><p className="template-token-help">Available fields: <code>{"{firstname}"}</code> <code>{"{lastname}"}</code> <code>{"{classification}"}</code></p><label className="brochure-check-field" aria-label="Active template"><input type="checkbox" checked={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))} /><span><strong>Active template</strong><small>Available in brochure email composition.</small></span></label></div><footer className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setOpen(false)}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save template"}</button></footer></form></section></div> : null}
    {deleteId ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Cancel template deletion" onClick={() => setDeleteId(null)} /><section className="modal-card brochure-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-template-title"><header className="modal-head"><div><p className="eyebrow">Permanent action</p><h2 id="delete-template-title">Delete this template?</h2></div></header><p>This removes the template from your brochure email options.</p><footer className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setDeleteId(null)}>Cancel</button><button className="danger-button" type="button" onClick={() => void remove()} disabled={pending}>{pending ? "Deleting…" : "Delete template"}</button></footer></section></div> : null}
    {testId ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Cancel test email" onClick={() => setTestId(null)} /><section className="modal-card brochure-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="test-template-title"><header className="modal-head"><div><p className="eyebrow">Template preview</p><h2 id="test-template-title">Send a test email</h2></div></header><form onSubmit={test}><div className="brochure-modal-fields"><label className="student-field"><span>Recipient email</span><input type="email" required value={testEmail} onChange={(event) => setTestEmail(event.target.value)} /></label></div><footer className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setTestId(null)}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send test"}</button></footer></form></section></div> : null}
  </div>;
}

export function BrochureWorkspace({ view, principal, brochureId }: { view: BrochureView; principal: StaffPrincipal; brochureId?: number }) {
  if (view === "request") return <RequestBrochure />;
  if (view === "templates") return <TemplateManager />;
  if (view === "detail" && brochureId) return <BrochureDetail brochureId={brochureId} />;
  return <BrochureList view={view === "followups" || view === "search" ? view : "new"} principal={principal} />;
}
