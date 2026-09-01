"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  deleteCustomerDevice,
  downloadCustomerDevices,
  listCustomerDevices,
  type CustomerDeviceFilters,
} from "../../lib/customer-device-api";
import type { CustomerDevice, CustomerDevicePagination } from "../../lib/customer-devices";
import { StaffApiError } from "../../lib/staff-api";
import type { StaffPrincipal } from "../../lib/staff";

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultExportDates() {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  return { start: inputDate(start), end: inputDate(end) };
}

function readableError(caught: unknown) {
  return caught instanceof StaffApiError
    ? caught.message
    : "Customer device records are temporarily unavailable. Please retry.";
}

function deviceLabel(value: string | null) {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

const emptyPagination: CustomerDevicePagination = {
  current_page: 1,
  per_page: 25,
  total: 0,
  last_page: 1,
};

export function CustomerDevicesWorkspace({ principal }: { principal: StaffPrincipal }) {
  const initialDates = defaultExportDates();
  const [draftSearch, setDraftSearch] = useState("");
  const [filters, setFilters] = useState<CustomerDeviceFilters>({ page: 1, perPage: 25 });
  const [devices, setDevices] = useState<CustomerDevice[]>([]);
  const [pagination, setPagination] = useState<CustomerDevicePagination>(emptyPagination);
  const [startDate, setStartDate] = useState(initialDates.start);
  const [endDate, setEndDate] = useState(initialDates.end);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDevice, setConfirmDevice] = useState<CustomerDevice | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    listCustomerDevices(filters)
      .then((response) => {
        if (!active) return;
        setDevices(response.data.items);
        setPagination(response.meta.pagination);
      })
      .catch((caught) => { if (active) setError(readableError(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = draftSearch.trim();
    if (value && value.length < 3) {
      setError("Enter at least three characters to search device records.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    setFilters({ search: value || undefined, page: 1, perPage: 25 });
  }

  function clearSearch() {
    setDraftSearch("");
    setLoading(true);
    setError("");
    setFilters({ page: 1, perPage: 25 });
  }

  async function exportDevices(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!startDate || !endDate || endDate < startDate) {
      setError("Choose an end date on or after the start date.");
      return;
    }
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const { blob, filename } = await downloadCustomerDevices(startDate, endDate);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`Export ready for ${startDate} through ${endDate}.`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setExporting(false);
    }
  }

  async function removeDevice() {
    if (!confirmDevice) return;
    setDeleting(confirmDevice.id);
    setError("");
    setNotice("");
    try {
      const response = await deleteCustomerDevice(confirmDevice.id);
      setDevices((current) => current.filter((device) => device.id !== confirmDevice.id));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
      setNotice(response.message);
      setConfirmDevice(null);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="student-workspace device-workspace">
      <header className="student-page-header">
        <div><p className="eyebrow">Security & access</p><h1>Customer Devices</h1><p>Review the devices, network addresses, and browser signatures associated with customer accounts.</p></div>
        <span className="device-audit-badge"><span aria-hidden="true">◎</span> Device audit</span>
      </header>

      <section className="device-toolbar-card" aria-label="Customer device tools">
        <form className="device-search-form" onSubmit={search}>
          <label className="student-field"><span>Search device records</span><span className="student-search-wrap"><span aria-hidden="true">⌕</span><input value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Email, IP address, or device ID" /></span></label>
          <div className="student-filter-actions"><button className="primary-button" type="submit">Find</button><button className="secondary-button" type="button" onClick={clearSearch}>Clear</button></div>
        </form>
        <form className="device-export-form" onSubmit={exportDevices}>
          <label className="student-field"><span>Export start date</span><input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label className="student-field"><span>Export end date</span><input type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} /></label>
          <button className="secondary-button device-export-button" type="submit" disabled={exporting}><span aria-hidden="true">⇩</span>{exporting ? "Preparing export…" : "Export devices"}</button>
        </form>
      </section>

      {error ? <div className="student-error" role="alert"><strong>Customer device action failed.</strong><span>{error}</span><button className="text-button" type="button" onClick={() => setError("")}>Dismiss</button></div> : null}
      {notice ? <div className="student-success" role="status"><strong>Done.</strong><span>{notice}</span><button className="text-button" type="button" onClick={() => setNotice("")}>Dismiss</button></div> : null}

      <section className="student-list-card">
        <header className="student-list-head"><div><h2>Recorded devices</h2><p>{loading ? "Loading device records…" : `${pagination.total.toLocaleString()} ${pagination.total === 1 ? "device" : "devices"}`}</p></div><span className="student-api-chip"><span aria-hidden="true" /> Live API data</span></header>
        {loading ? <div className="student-loading" aria-live="polite">Loading the latest device records…</div> : null}
        {!loading && !devices.length ? <div className="student-empty"><strong>No customer devices match this search.</strong><span>Try an email address, IP address, or device fingerprint.</span><button className="secondary-button" type="button" onClick={clearSearch}>Clear search</button></div> : null}
        {!loading && devices.length ? <div className="student-table-scroll"><table className="student-table device-table">
          <thead><tr><th>ID</th><th>Email</th><th>Device type</th><th>Device ID</th><th>IP address</th><th>Location</th><th>User agent</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{devices.map((device) => <tr key={device.id}>
            <td><span className="device-record-id">#{device.id}</span></td>
            <td><a className="device-email" href={device.email ? `mailto:${device.email}` : undefined}>{device.email || "No email"}</a><small className="device-customer-id">Customer #{device.customer_id}</small></td>
            <td><span className={`device-type-pill ${device.device_type?.toLowerCase() ?? "unknown"}`}>{deviceLabel(device.device_type)}</span></td>
            <td><code className="device-fingerprint">{device.fingerprint || "—"}</code></td>
            <td><code className="device-ip">{device.ip_address || "—"}</code></td>
            <td><span className="device-location">{device.location || "Unknown"}</span></td>
            <td><span className="device-user-agent" title={device.user_agent ?? undefined}>{device.user_agent || "Unknown"}</span></td>
            <td>{principal.capabilities.includes("customer-devices.delete") ? <button className="device-delete-button" type="button" onClick={() => setConfirmDevice(device)} aria-label={`Delete device ${device.id}`}>Delete</button> : null}</td>
          </tr>)}</tbody>
        </table></div> : null}
        {pagination.last_page > 1 ? <footer className="student-pagination"><span>Page {pagination.current_page} of {pagination.last_page}</span><div><button className="secondary-button" type="button" disabled={pagination.current_page <= 1} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page - 1 })); }}>Previous</button><button className="secondary-button" type="button" disabled={pagination.current_page >= pagination.last_page} onClick={() => { setLoading(true); setFilters((current) => ({ ...current, page: pagination.current_page + 1 })); }}>Next</button></div></footer> : null}
      </section>

      {confirmDevice ? <div className="modal-backdrop"><button className="modal-dismiss-layer" type="button" aria-label="Cancel device deletion" onClick={() => setConfirmDevice(null)} /><section className="modal-card device-delete-modal" role="dialog" aria-modal="true" aria-labelledby="device-delete-title"><header className="modal-head"><div><p className="eyebrow">Permanent action</p><h2 id="device-delete-title">Delete device #{confirmDevice.id}?</h2></div><button className="modal-close" type="button" onClick={() => setConfirmDevice(null)} aria-label="Close">×</button></header><p>This removes the recorded fingerprint for <strong>{confirmDevice.email || `customer #${confirmDevice.customer_id}`}</strong>. The customer may register the device again on a future sign-in.</p><div className="device-modal-actions"><button className="secondary-button" type="button" onClick={() => setConfirmDevice(null)} disabled={deleting !== null}>Cancel</button><button className="danger-action-button" type="button" onClick={() => void removeDevice()} disabled={deleting !== null}>{deleting ? "Deleting…" : "Delete device"}</button></div></section></div> : null}
    </div>
  );
}
