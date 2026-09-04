"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { convertMessageToBrochure, getBrochureConversion, getMessage, getMessageOptions, listMessages, searchMessageCustomers, setMessageArchived, updateMessage } from "../../lib/message-center-api";
import type { BrochureConversionInput, MessageCustomer, MessageFilters, MessagePagination, MessageStaffOption, StaffMessage } from "../../lib/message-center";
import { StaffApiError } from "../../lib/staff-api";

const initialFilters: MessageFilters = { folder: "inbox", search: "", answer: "all", priority: "all", page: 1, perPage: 25 };
const initialPagination: MessagePagination = { current_page: 1, per_page: 25, total: 0, last_page: 1 };

function messagePreview(message: StaffMessage) {
  const text = (message.body ?? "").replace(/\s+/g, " ").trim();
  return text.length > 112 ? `${text.slice(0, 112)}…` : text || "No message content";
}

function errorMessage(error: unknown) {
  return error instanceof StaffApiError ? error.message : "The Message Center is temporarily unavailable. Please retry.";
}

export function MessageCenterWorkspace({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [filters, setFilters] = useState<MessageFilters>(initialFilters);
  const [draftSearch, setDraftSearch] = useState("");
  const [items, setItems] = useState<StaffMessage[]>([]);
  const [counts, setCounts] = useState({ inbox: 0, archive: 0 });
  const [pagination, setPagination] = useState(initialPagination);
  const [selected, setSelected] = useState<StaffMessage | null>(null);
  const [staff, setStaff] = useState<MessageStaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<MessageCustomer[]>([]);
  const [customerSearching, setCustomerSearching] = useState(false);
  const [conversion, setConversion] = useState<{ defaults: BrochureConversionInput; classifications: string[] } | null>(null);

  const handleError = useCallback((caught: unknown) => {
    if (caught instanceof StaffApiError && caught.status === 401) {
      onSessionExpired();
      return;
    }
    setError(errorMessage(caught));
  }, [onSessionExpired]);

  const load = useCallback(async (next: MessageFilters, preferredId?: number) => {
    setLoading(true);
    setError("");
    try {
      const result = await listMessages(next);
      setItems(result.data.items);
      setCounts(result.data.counts);
      setPagination(result.meta.pagination);
      const nextId = preferredId;
      const summary = result.data.items.find((item) => item.id === nextId) ?? result.data.items[0] ?? null;
      if (!summary) setSelected(null);
      else {
        const detail = await getMessage(summary.id);
        setSelected(detail.data.message);
        setStaff(detail.data.staff);
      }
    } catch (caught) {
      handleError(caught);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(filters);
    // The filter object is the single refresh boundary; selection changes should not reload the list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.folder, filters.search, filters.answer, filters.priority, filters.adminId, filters.page, filters.perPage]);

  useEffect(() => {
    void getMessageOptions().then((result) => setStaff(result.data.staff)).catch(handleError);
  }, [handleError]);

  async function openMessage(id: number) {
    setPending(true); setError(""); setNotice(""); setCustomerResults([]); setCustomerSearch("");
    try {
      const result = await getMessage(id);
      setSelected(result.data.message); setStaff(result.data.staff);
    } catch (caught) { handleError(caught); }
    finally { setPending(false); }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: draftSearch.trim(), page: 1 }));
  }

  async function saveMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    setPending(true); setError(""); setNotice("");
    try {
      const result = await updateMessage(selected.id, {
        full_name: String(data.get("full_name") ?? ""), email: String(data.get("email") ?? ""),
        phone_number: String(data.get("phone_number") ?? ""), phone_number_extension: String(data.get("phone_number_extension") ?? ""),
        message: String(data.get("message") ?? ""), answer: data.get("answer") === "answered" ? "answered" : "unanswered",
        priority: data.get("priority") === "Urgent" ? "Urgent" : "Normal", admin_id: data.get("admin_id") ? Number(data.get("admin_id")) : null,
        customer_id: selected.customer?.id ?? null, receive_sms: data.get("receive_sms") === "on",
      });
      setSelected(result.data); setNotice(result.message);
      await load(filters, selected.id);
    } catch (caught) { handleError(caught); }
    finally { setPending(false); }
  }

  async function toggleArchive() {
    if (!selected) return;
    setPending(true); setError(""); setNotice("");
    try {
      const result = await setMessageArchived(selected.id, !selected.archived);
      setNotice(result.message);
      await load(filters);
    } catch (caught) { handleError(caught); }
    finally { setPending(false); }
  }

  async function findCustomers() {
    if (customerSearch.trim().length < 2) { setError("Enter at least two characters to search customers."); return; }
    setCustomerSearching(true); setError("");
    try { setCustomerResults((await searchMessageCustomers(customerSearch.trim())).data.items); }
    catch (caught) { handleError(caught); }
    finally { setCustomerSearching(false); }
  }

  async function openConversion() {
    if (!selected || selected.brochure) return;
    setPending(true); setError("");
    try {
      const result = await getBrochureConversion(selected.id);
      setConversion({ defaults: result.data.defaults, classifications: result.data.classifications });
    } catch (caught) { handleError(caught); }
    finally { setPending(false); }
  }

  async function convert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const input: BrochureConversionInput = {
      first_name: String(data.get("first_name") ?? ""), last_name: String(data.get("last_name") ?? ""),
      address: String(data.get("address") ?? ""), city: String(data.get("city") ?? ""), state: String(data.get("state") ?? ""), zip: String(data.get("zip") ?? ""),
      email: String(data.get("email") ?? ""), phone: String(data.get("phone") ?? ""), phone_extension: String(data.get("phone_extension") ?? ""),
      classification: String(data.get("classification") ?? ""), ad: String(data.get("ad") ?? ""), notes: String(data.get("notes") ?? ""), receive_sms: data.get("receive_sms") === "on",
    };
    setPending(true); setError("");
    try {
      const result = await convertMessageToBrochure(selected.id, input);
      setSelected(result.data.message); setConversion(null); setNotice(result.message);
      await load(filters, selected.id);
    } catch (caught) { handleError(caught); }
    finally { setPending(false); }
  }

  return <div className="student-workspace message-workspace">
    <header className="student-page-header message-heading"><div><p className="eyebrow">Customer communications</p><h1>Message Center</h1><p>Find incoming inquiries, connect them to customer records, assign follow-up, and turn qualified interest into brochure requests.</p></div><span className="message-live-badge"><span aria-hidden="true">●</span> Live inbox</span></header>
    {error ? <div className="student-alert" role="alert"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error">×</button></div> : null}
    {notice ? <div className="student-alert success" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div> : null}

    <section className="message-toolbar" aria-label="Message filters">
      <div className="message-folders" role="group" aria-label="Message folders">
        <button type="button" className={filters.folder === "inbox" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, folder: "inbox", page: 1 }))}>Inbox <span>{counts.inbox}</span></button>
        <button type="button" className={filters.folder === "archive" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, folder: "archive", page: 1 }))}>Archive <span>{counts.archive}</span></button>
        <button type="button" className={filters.folder === "all" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, folder: "all", page: 1 }))}>All</button>
      </div>
      <form className="message-search" role="search" onSubmit={submitSearch}><label className="sr-only" htmlFor="message-search">Search messages</label><span aria-hidden="true">⌕</span><input id="message-search" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search name, email, phone, message, or ID" /><button type="submit">Search</button>{filters.search ? <button type="button" className="clear" onClick={() => { setDraftSearch(""); setFilters((current) => ({ ...current, search: "", page: 1 })); }}>Clear</button> : null}</form>
      <div className="message-filter-row">
        <label>Response <select value={filters.answer} onChange={(event) => setFilters((current) => ({ ...current, answer: event.target.value as MessageFilters["answer"], page: 1 }))}><option value="all">All</option><option value="unanswered">Needs response</option><option value="answered">Answered</option></select></label>
        <label>Priority <select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value as MessageFilters["priority"], page: 1 }))}><option value="all">All</option><option value="Urgent">Urgent</option><option value="Normal">Normal</option></select></label>
        <label>Assigned to <select value={filters.adminId ?? ""} onChange={(event) => setFilters((current) => ({ ...current, adminId: event.target.value === "" ? undefined : Number(event.target.value), page: 1 }))}><option value="">Anyone</option><option value="0">Unassigned</option>{staff.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
      </div>
    </section>

    <section className="message-layout">
      <div className="message-list-panel" aria-label="Messages">
        <div className="message-list-meta"><strong>{loading ? "Loading messages…" : `${pagination.total} message${pagination.total === 1 ? "" : "s"}`}</strong><span>Newest first</span></div>
        {!loading && !items.length ? <div className="message-empty"><span aria-hidden="true">✉</span><strong>No messages found</strong><p>Try another folder or broaden the search filters.</p></div> : null}
        <ol className="message-list">{items.map((message) => <li key={message.id}><button type="button" className={selected?.id === message.id ? "active" : ""} onClick={() => void openMessage(message.id)} aria-current={selected?.id === message.id ? "true" : undefined}><span className={`message-avatar ${message.priority === "Urgent" ? "urgent" : ""}`}>{message.full_name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="message-list-copy"><span><strong>{message.full_name}</strong><time>{message.received_at || "Time unavailable"}</time></span><b>{message.subject || `Message #${message.id}`}</b><small>{messagePreview(message)}</small><span className="message-tags">{!message.answered ? <em>Needs response</em> : <em className="answered">Answered</em>}{message.assignment ? <i>{message.assignment.name}</i> : <i>Unassigned</i>}{message.customer ? <i>Customer linked</i> : null}</span></span></button></li>)}</ol>
        {pagination.last_page > 1 ? <nav className="message-pagination" aria-label="Message pages"><button type="button" disabled={pagination.current_page <= 1} onClick={() => setFilters((current) => ({ ...current, page: current.page - 1 }))}>Previous</button><span>Page {pagination.current_page} of {pagination.last_page}</span><button type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => setFilters((current) => ({ ...current, page: current.page + 1 }))}>Next</button></nav> : null}
      </div>

      <div className="message-detail-panel">
        {!selected ? <div className="message-empty detail"><span aria-hidden="true">↗</span><strong>Select a message</strong><p>Message details and follow-up actions will appear here.</p></div> : <form key={selected.id} onSubmit={saveMessage}>
          <header className="message-detail-head"><div><p>Message #{selected.id}</p><h2>{selected.subject || selected.full_name}</h2><span>{selected.received_at || "Received time unavailable"}{selected.webhook_lead ? " · Web inquiry" : ""}</span></div><div><button className="secondary-button compact" type="button" onClick={() => void toggleArchive()} disabled={pending}>{selected.archived ? "Restore to inbox" : "Archive"}</button>{selected.brochure ? <Link className="primary-button compact" href={selected.brochure.href}>Open brochure</Link> : <button className="primary-button compact" type="button" onClick={() => void openConversion()} disabled={pending}>Convert to brochure</button>}</div></header>
          <div className="message-detail-body">
            <section className="message-form-section"><h3>Inquiry</h3><div className="message-form-grid"><label>Customer name<input name="full_name" required defaultValue={selected.full_name} /></label><label>Email<input name="email" type="email" defaultValue={selected.email ?? ""} /></label><label>Phone<input name="phone_number" defaultValue={selected.phone ?? ""} /></label><label>Extension<input name="phone_number_extension" defaultValue={selected.phone_extension ?? ""} /></label><label className="wide">Message<textarea name="message" rows={7} defaultValue={selected.body ?? ""} /></label></div></section>
            <section className="message-form-section"><h3>Follow-up</h3><div className="message-form-grid"><label>Status<select name="answer" defaultValue={selected.answered ? "answered" : "unanswered"}><option value="unanswered">Needs response</option><option value="answered">Answered</option></select></label><label>Priority<select name="priority" defaultValue={selected.priority}><option value="Normal">Normal</option><option value="Urgent">Urgent</option></select></label><label className="wide">Assigned staff<select name="admin_id" defaultValue={selected.assignment?.id ?? ""}><option value="">Anybody / unassigned</option>{staff.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label><label className="message-check wide"><input name="receive_sms" type="checkbox" defaultChecked={selected.receive_sms} /> Customer agreed to receive SMS follow-up</label></div></section>
            <section className="message-form-section customer-association"><div className="message-section-head"><div><h3>Customer association</h3><p>Link this inquiry to the correct customer record.</p></div>{selected.customer ? <button type="button" onClick={() => setSelected({ ...selected, customer: null })}>Remove link</button> : null}</div>{selected.customer ? <Link className="linked-customer" href={selected.customer.href}><span aria-hidden="true">CU</span><span><strong>{selected.customer.name}</strong><small>Customer #{selected.customer.id} · {selected.customer.email || "No email"}</small></span><b>Open record →</b></Link> : <><div className="customer-link-search"><label className="sr-only" htmlFor="customer-link-search">Find customer</label><input id="customer-link-search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void findCustomers(); } }} placeholder="Name, email, phone, or customer ID" /><button type="button" onClick={() => void findCustomers()} disabled={customerSearching}>{customerSearching ? "Searching…" : "Find customer"}</button></div>{customerResults.length ? <ul className="customer-search-results">{customerResults.map((customer) => <li key={customer.id}><button type="button" onClick={() => { setSelected({ ...selected, customer }); setCustomerResults([]); }}><strong>{customer.name}</strong><span>#{customer.id} · {customer.email || customer.phone || "No contact details"}</span></button></li>)}</ul> : null}</>}</section>
          </div>
          <footer className="message-detail-footer"><span>{selected.brochure ? `Converted to brochure #${selected.brochure.id}` : "Changes are enforced by the staff API."}</span><button className="primary-button compact" type="submit" disabled={pending}>{pending ? "Saving…" : "Save message"}</button></footer>
        </form>}
      </div>
    </section>

    {conversion && selected ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close brochure conversion" onClick={() => setConversion(null)} /><section className="modal-card message-conversion-modal" role="dialog" aria-modal="true" aria-labelledby="message-conversion-title"><header className="modal-head"><div><p className="eyebrow">Qualified inquiry</p><h2 id="message-conversion-title">Create brochure request</h2><p>Review the contact details before creating the live brochure record.</p></div><button className="modal-close" type="button" onClick={() => setConversion(null)} aria-label="Close">×</button></header><form onSubmit={convert}><div className="message-form-grid"><label>First name<input name="first_name" required defaultValue={conversion.defaults.first_name} /></label><label>Last name<input name="last_name" defaultValue={conversion.defaults.last_name} /></label><label className="wide">Email<input name="email" type="email" required defaultValue={conversion.defaults.email} /></label><label>Phone<input name="phone" defaultValue={conversion.defaults.phone} /></label><label>Extension<input name="phone_extension" defaultValue={conversion.defaults.phone_extension} /></label><label className="wide">Address<input name="address" defaultValue={conversion.defaults.address} /></label><label>City<input name="city" defaultValue={conversion.defaults.city} /></label><label>State<input name="state" maxLength={2} defaultValue={conversion.defaults.state} /></label><label>ZIP<input name="zip" defaultValue={conversion.defaults.zip} /></label><label>How they found us<input name="ad" defaultValue={conversion.defaults.ad} /></label><label className="wide">Classification<input name="classification" list="message-classifications" defaultValue={conversion.defaults.classification} /><datalist id="message-classifications">{conversion.classifications.map((value) => <option key={value} value={value} />)}</datalist></label><label className="wide">Notes<textarea name="notes" rows={5} defaultValue={conversion.defaults.notes} /></label><label className="message-check wide"><input name="receive_sms" type="checkbox" defaultChecked={conversion.defaults.receive_sms} /> Customer agreed to receive SMS</label></div><footer><button className="secondary-button" type="button" onClick={() => setConversion(null)} disabled={pending}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Creating request…" : "Create brochure request"}</button></footer></form></section></div> : null}
  </div>;
}
