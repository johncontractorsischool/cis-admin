"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getNewOrder, listNewOrders, markNewOrderShipped, markNewOrdersShipped, updateNewOrder, type NewOrderFilters } from "../../lib/new-order-api";
import type { NewOrderDetail, NewOrderInput, NewOrderPagination, NewOrderSummary, SalespersonOption } from "../../lib/new-orders";
import { StaffApiError } from "../../lib/staff-api";

const emptyPagination: NewOrderPagination = { current_page: 1, per_page: 50, total: 0, last_page: 1 };

function fullName(order: Pick<NewOrderSummary, "First_name" | "Last_name">) { return `${order.First_name} ${order.Last_name}`.trim(); }
function money(value: string | number | null) { const number = Number(value ?? 0); return Number.isFinite(number) ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number) : "—"; }
function readableError(caught: unknown) { return caught instanceof StaffApiError ? caught.message : "New orders are temporarily unavailable. Please retry."; }
function escapeHtml(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character); }

function orderInput(order: NewOrderDetail): NewOrderInput {
  return { first_name: order.First_name, last_name: order.Last_name, email: order.cust_email, phone: order.phone ?? "", phone_extension: order.phone_extension ?? "", company: order.company ?? "", non_sale: Boolean(order.non_sale), admin_id: order.admin_id, ...order.shipping };
}

function printableDocument(kind: "labels" | "invoices", orders: NewOrderDetail[]) {
  const body = kind === "labels"
    ? orders.map((order) => `<section class="label"><strong>${escapeHtml(fullName(order))}</strong><span>${escapeHtml(order.shipping.address1)} ${escapeHtml(order.shipping.address2)}</span><span>${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.state)} ${escapeHtml(order.shipping.zip)}</span></section>`).join("")
    : orders.map((order) => `<section class="invoice"><header><div><h1>Contractor Institute</h1><p>Order #${order.id}</p></div><div><strong>${escapeHtml(order.order_date)}</strong><span>${escapeHtml(order.salesperson)}</span></div></header><div class="columns"><div><h2>Customer</h2><p>${escapeHtml(fullName(order))}<br>${escapeHtml(order.company)}<br>${escapeHtml(order.cust_email)}<br>${escapeHtml(order.phone)}</p></div><div><h2>Ship to</h2><p>${escapeHtml(order.shipping.address1)} ${escapeHtml(order.shipping.address2)}<br>${escapeHtml(order.shipping.city)}, ${escapeHtml(order.shipping.state)} ${escapeHtml(order.shipping.zip)}</p></div></div><table><thead><tr><th>Description</th><th>Amount</th></tr></thead><tbody>${order.items.map((item) => `<tr><td>${escapeHtml(item.description)}</td><td>${escapeHtml(money(item.price))}</td></tr>`).join("")}</tbody><tfoot><tr><th>Total</th><th>${escapeHtml(money(order.grand_total))}</th></tr></tfoot></table>${order.orderinstructions ? `<p class="notes"><strong>Instructions:</strong> ${escapeHtml(order.orderinstructions)}</p>` : ""}</section>`).join("");
  return `<!doctype html><html><head><title>${kind === "labels" ? "Shipping labels" : "Order invoices"}</title><style>@page{margin:20mm}*{box-sizing:border-box}body{margin:0;color:#172631;font:14px Arial,sans-serif}.label{display:grid;gap:7px;width:4in;min-height:1.35in;padding:.18in .25in;border:1px dashed #9aabb4;page-break-after:always;font-size:16px;line-height:1.25}.label strong{font-size:18px}.invoice{page-break-after:always}.invoice header{display:flex;justify-content:space-between;border-bottom:3px solid #2387b6;padding-bottom:16px}.invoice header div:last-child{display:grid;text-align:right}.invoice h1{margin:0}.invoice h2{font-size:12px;text-transform:uppercase}.columns{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:24px 0}.columns p{line-height:1.6}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #dce5ea;padding:10px;text-align:left}th:last-child,td:last-child{text-align:right}.notes{margin-top:24px;padding:12px;background:#f4f8fa}@media print{.label,.invoice{border-color:transparent}}</style></head><body>${body}<script>window.addEventListener("load",()=>window.print())</script></body></html>`;
}

export function NewOrderWorkspace() {
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState<NewOrderFilters>({ page: 1, perPage: 50 });
  const [orders, setOrders] = useState<NewOrderSummary[]>([]);
  const [pagination, setPagination] = useState<NewOrderPagination>(emptyPagination);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<NewOrderDetail | null>(null);
  const [editForm, setEditForm] = useState<NewOrderInput | null>(null);
  const [salespeople, setSalespeople] = useState<SalespersonOption[]>([]);
  const [shipIds, setShipIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    listNewOrders(filters).then((response) => {
      if (!active) return;
      setOrders(response.data.items);
      setPagination(response.meta.pagination);
      setSelected(new Set());
    }).catch((caught) => { if (active) setError(readableError(caught)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setError(""); setFilters({ search: draftSearch.trim() || undefined, page: 1, perPage: 50 }); }
  function clearSearch() { setDraftSearch(""); setLoading(true); setError(""); setFilters({ page: 1, perPage: 50 }); }
  function toggle(id: number) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function toggleAll() { setSelected((current) => current.size === orders.length ? new Set() : new Set(orders.map((order) => order.id))); }

  async function openEdit(id: number) {
    setPending(true); setError("");
    try { const response = await getNewOrder(id); setEditing(response.data.order); setEditForm(orderInput(response.data.order)); setSalespeople(response.data.salespeople); }
    catch (caught) { setError(readableError(caught)); }
    finally { setPending(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editing || !editForm) return;
    setPending(true); setError(""); setNotice("");
    try { const response = await updateNewOrder(editing.id, editForm); setOrders((current) => current.map((order) => order.id === editing.id ? { ...order, ...response.data, salesperson: response.data.admin } : order)); setEditing(null); setEditForm(null); setNotice(response.message); }
    catch (caught) { setError(readableError(caught)); }
    finally { setPending(false); }
  }

  async function confirmShipping() {
    if (!shipIds.length) return;
    setPending(true); setError(""); setNotice("");
    try {
      const response = shipIds.length === 1 ? await markNewOrderShipped(shipIds[0]) : await markNewOrdersShipped(shipIds);
      setOrders((current) => current.filter((order) => !shipIds.includes(order.id)));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - shipIds.length) }));
      setSelected(new Set()); setShipIds([]); setNotice(response.message);
    } catch (caught) { setError(readableError(caught)); }
    finally { setPending(false); }
  }

  async function printSelected(kind: "labels" | "invoices") {
    if (!selected.size) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) { setError("Allow pop-ups for this staff site to open the print view."); return; }
    printWindow.opener = null;
    printWindow.document.write("<p style='font-family:sans-serif'>Preparing selected orders…</p>");
    setPending(true); setError("");
    try {
      const details = await Promise.all([...selected].map((id) => getNewOrder(id).then((response) => response.data.order)));
      printWindow.document.open(); printWindow.document.write(printableDocument(kind, details)); printWindow.document.close();
      setNotice(`${kind === "labels" ? "Label" : "Invoice"} print view opened for ${details.length} selected ${details.length === 1 ? "order" : "orders"}.`);
    } catch (caught) { printWindow.close(); setError(readableError(caught)); }
    finally { setPending(false); }
  }

  function change(field: keyof NewOrderInput, value: string | number | boolean | null) { setEditForm((current) => current ? { ...current, [field]: value } : current); }

  return <div className="student-workspace new-order-workspace">
    <header className="student-page-header"><div><p className="eyebrow">Order fulfillment</p><h1>New Orders</h1><p>Review unshipped orders, correct customer and delivery details, and move completed packages into today’s shipments.</p></div><span className="order-queue-badge"><span aria-hidden="true">▣</span>{loading ? "Syncing queue" : `${pagination.total} awaiting shipment`}</span></header>

    <section className="new-order-toolbar" aria-label="New order tools">
      <form onSubmit={search}><label className="student-field"><span>Search orders</span><span className="student-search-wrap"><span aria-hidden="true">⌕</span><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Order ID, customer, email, or phone" /></span></label><button className="primary-button" type="submit">Search</button><button className="secondary-button" type="button" onClick={clearSearch}>Clear</button></form>
      <div className="order-bulk-actions"><span>{selected.size ? `${selected.size} selected` : "Select orders for bulk actions"}</span><button type="button" className="secondary-button" disabled={!selected.size || pending} onClick={() => void printSelected("labels")}>Export labels</button><button type="button" className="secondary-button" disabled={!selected.size || pending} onClick={() => void printSelected("invoices")}>Export invoices</button><button type="button" className="order-ship-button" disabled={!selected.size || pending} onClick={() => setShipIds([...selected])}>Mark selected shipped</button></div>
    </section>

    {error ? <div className="student-error" role="alert"><strong>Order action failed.</strong><span>{error}</span><button className="text-button" type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
    {notice ? <div className="student-success" role="status"><strong>Done.</strong><span>{notice}</span><button className="text-button" type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}

    <section className="student-list-card"><header className="student-list-head"><div><h2>Fulfillment queue</h2><p>{loading ? "Loading unshipped orders…" : `${pagination.total.toLocaleString()} open ${pagination.total === 1 ? "order" : "orders"}`}</p></div><span className="student-api-chip"><span aria-hidden="true" /> Live API data</span></header>
      {loading ? <div className="student-loading">Loading the latest new orders…</div> : null}
      {!loading && !orders.length ? <div className="student-empty"><strong>No unshipped orders match this search.</strong><span>Clear the search or check back after new sales are processed.</span><button className="secondary-button" type="button" onClick={clearSearch}>Clear search</button></div> : null}
      {!loading && orders.length ? <div className="student-table-scroll"><table className="student-table new-order-table"><thead><tr><th><input type="checkbox" checked={selected.size === orders.length && orders.length > 0} onChange={toggleAll} aria-label="Select all visible orders" /></th><th>ID</th><th>Name</th><th>Order date</th><th>Email</th><th>Phone</th><th>Grand total</th><th>Salesperson</th><th>Non-sale</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className={selected.has(order.id) ? "selected" : ""}><td><input type="checkbox" checked={selected.has(order.id)} onChange={() => toggle(order.id)} aria-label={`Select order ${order.id}`} /></td><td><strong className="order-number">#{order.id}</strong></td><td><span className="table-stack"><strong>{fullName(order)}</strong><small>{order.admin_id ? `Assigned staff #${order.admin_id}` : "Unassigned"}</small></span></td><td>{order.order_date || "—"}</td><td><a className="device-email" href={`mailto:${order.cust_email}`}>{order.cust_email}</a></td><td><span className="table-stack"><strong>{order.phone || "—"}</strong><small>{order.phone_extension ? `ext. ${order.phone_extension}` : "No extension"}</small></span></td><td><strong>{money(order.grand_total)}</strong></td><td>{order.salesperson || order.admin || "Unassigned"}</td><td><span className={`order-sale-pill ${order.non_sale ? "non-sale" : "sale"}`}>{order.non_sale ? "Non-sale" : "Sale"}</span></td><td><div className="order-row-actions"><button type="button" onClick={() => void openEdit(order.id)} disabled={pending}>Edit</button><button type="button" className="ship" onClick={() => setShipIds([order.id])}>Mark shipped</button></div></td></tr>)}</tbody></table></div> : null}
      {pagination.last_page > 1 ? <footer className="student-pagination"><span>Page {pagination.current_page} of {pagination.last_page}</span><div><button className="secondary-button" type="button" disabled={pagination.current_page <= 1} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page - 1 })); }}>Previous</button><button className="secondary-button" type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page + 1 })); }}>Next</button></div></footer> : null}
    </section>

    {editing && editForm ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Close order editor" onClick={() => setEditing(null)} /><section className="modal-card order-edit-modal" role="dialog" aria-modal="true" aria-labelledby="order-edit-title"><header className="modal-head"><div><p className="eyebrow">Order #{editing.id}</p><h2 id="order-edit-title">Edit order</h2></div><button className="modal-close" type="button" onClick={() => setEditing(null)} aria-label="Close">×</button></header><form onSubmit={save}><div className="order-edit-grid"><label className="student-field"><span>Salesperson</span><select value={editForm.admin_id ?? ""} onChange={(event) => change("admin_id", event.target.value ? Number(event.target.value) : null)}><option value="">Unassigned</option><optgroup label="Active">{salespeople.filter((person) => person.active).map((person) => <option key={person.id} value={person.id}>{person.name} (#{person.id})</option>)}</optgroup><optgroup label="Inactive">{salespeople.filter((person) => !person.active).map((person) => <option key={person.id} value={person.id}>{person.name} (#{person.id})</option>)}</optgroup></select></label><label className="student-field"><span>First name</span><input required value={editForm.first_name} onChange={(event) => change("first_name", event.target.value)} /></label><label className="student-field"><span>Last name</span><input required value={editForm.last_name} onChange={(event) => change("last_name", event.target.value)} /></label><label className="student-field"><span>Email</span><input required type="email" value={editForm.email} onChange={(event) => change("email", event.target.value)} /></label><label className="student-field"><span>Phone</span><input type="tel" value={editForm.phone} onChange={(event) => change("phone", event.target.value)} /></label><label className="student-field"><span>Extension</span><input inputMode="numeric" maxLength={5} value={editForm.phone_extension} onChange={(event) => change("phone_extension", event.target.value.replace(/\D/g, ""))} /></label><label className="student-field"><span>Company</span><input value={editForm.company} onChange={(event) => change("company", event.target.value)} /></label><div className="order-checkbox-field"><input id="order-non-sale" type="checkbox" checked={editForm.non_sale} onChange={(event) => change("non_sale", event.target.checked)} /><label htmlFor="order-non-sale"><strong>Non-sale order</strong><small>Exclude this fulfillment from sales reporting.</small></label></div><div className="order-form-divider"><strong>Shipping address</strong><span>Printed on labels and invoices</span></div><label className="student-field order-wide-field"><span>Address line 1</span><input value={editForm.address1} onChange={(event) => change("address1", event.target.value)} /></label><label className="student-field order-wide-field"><span>Address line 2</span><input value={editForm.address2} onChange={(event) => change("address2", event.target.value)} /></label><label className="student-field"><span>City</span><input value={editForm.city} onChange={(event) => change("city", event.target.value)} /></label><label className="student-field"><span>State</span><input maxLength={2} value={editForm.state} onChange={(event) => change("state", event.target.value.toUpperCase())} /></label><label className="student-field"><span>ZIP</span><input value={editForm.zip} onChange={(event) => change("zip", event.target.value)} /></label></div><footer className="order-modal-footer"><button className="secondary-button" type="button" onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Update order"}</button></footer></form></section></div> : null}

    {shipIds.length ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Cancel shipping action" onClick={() => setShipIds([])} /><section className="modal-card order-ship-modal" role="dialog" aria-modal="true" aria-labelledby="order-ship-title"><header className="modal-head"><div><p className="eyebrow">Fulfillment confirmation</p><h2 id="order-ship-title">Mark {shipIds.length === 1 ? `order #${shipIds[0]}` : `${shipIds.length} orders`} as shipped?</h2></div><button className="modal-close" type="button" onClick={() => setShipIds([])} aria-label="Close">×</button></header><p>This removes the selected {shipIds.length === 1 ? "order" : "orders"} from the new-order queue and records today as the ship date.</p><div className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setShipIds([])} disabled={pending}>Cancel</button><button className="order-ship-button" type="button" onClick={() => void confirmShipping()} disabled={pending}>{pending ? "Marking shipped…" : "Mark shipped"}</button></div></section></div> : null}
  </div>;
}
