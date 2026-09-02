"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getApplicationRecord,
  getOrderRecord,
} from "../../lib/global-search-api";
import type {
  ApplicationSearchRecord,
  OrderSearchRecord,
} from "../../lib/global-search";
import { StaffApiError } from "../../lib/staff-api";

function errorMessage(caught: unknown, record: string) {
  return caught instanceof StaffApiError
    ? caught.message
    : `We couldn’t load this ${record}. Please try again.`;
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ").replaceAll("-", " ") : "—";
}

function money(value: string | number | null) {
  if (value === null || value === "") return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number)
    : String(value);
}

function Detail({ name, value }: { name: string; value: string | number | null | undefined }) {
  return <div><dt>{name}</dt><dd>{value === null || value === undefined || value === "" ? "—" : value}</dd></div>;
}

export function OrderRecordWorkspace({ recordId }: { recordId: number }) {
  const [record, setRecord] = useState<OrderSearchRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getOrderRecord(recordId)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((caught) => { if (active) setError(errorMessage(caught, "order")); });
    return () => { active = false; };
  }, [recordId]);

  if (error) return <RecordError message={error} />;
  if (!record) return <div className="student-loading page-loading">Loading order record…</div>;

  return <div className="student-workspace detail-workspace search-record-workspace">
    <Link className="student-back" href="/staff">← Back to Staff Hub</Link>
    <header className="student-page-header"><div><p className="eyebrow">Order history</p><h1>{record.order_number ? `Order ${record.order_number}` : `Order #${record.id}`}</h1><p>{record.customer_name} · Record #{record.id}</p></div><span className={`account-pill ${record.shipped ? "full" : "disabled"}`}>{record.shipped ? "Shipped" : "Pending"}</span></header>
    <section className="student-section-card"><header><div><h2>Customer and fulfillment</h2><p>Read-only order information returned by the staff API.</p></div></header><dl className="student-definition-grid">
      <Detail name="Customer" value={record.customer_name} /><Detail name="Email" value={record.email} /><Detail name="Phone" value={record.phone} /><Detail name="Company" value={record.company} />
      <Detail name="Order date" value={record.order_date} /><Detail name="Ship date" value={record.ship_date} /><Detail name="Shipping method" value={record.shipping_type} /><Detail name="Tracking number" value={record.tracking_number} />
      <Detail name="SKU" value={record.sku} /><Detail name="Classification" value={record.classification} /><Detail name="Salesperson" value={record.salesperson} />
    </dl></section>
    <section className="student-section-card"><header><div><h2>Order summary</h2><p>Amounts exclude protected payment credentials.</p></div></header><dl className="student-definition-grid">
      <Detail name="Subtotal" value={money(record.subtotal)} /><Detail name="Shipping" value={money(record.shipping_price)} /><Detail name="Sales tax" value={money(record.sales_tax)} /><Detail name="Total" value={money(record.grand_total)} />
      <Detail name="Description" value={record.item_description} /><Detail name="Instructions" value={record.instructions} />
    </dl></section>
  </div>;
}

export function ApplicationRecordWorkspace({ recordId }: { recordId: number }) {
  const [record, setRecord] = useState<ApplicationSearchRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getApplicationRecord(recordId)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((caught) => { if (active) setError(errorMessage(caught, "application")); });
    return () => { active = false; };
  }, [recordId]);

  if (error) return <RecordError message={error} />;
  if (!record) return <div className="student-loading page-loading">Loading application record…</div>;

  return <div className="student-workspace detail-workspace search-record-workspace">
    <Link className="student-back" href={`/staff/students/${record.customer_id}`}>← Open complete student record</Link>
    <header className="student-page-header"><div><p className="eyebrow">Application record</p><h1>{record.application_number || `Application #${record.id}`}</h1><p>{record.customer_name} · Customer #{record.customer_id}</p></div><span className="classification-chip">{label(record.status)}</span></header>
    <section className="student-section-card"><header><div><h2>Application status</h2><p>Current synchronized iApplication fields.</p></div></header><dl className="student-definition-grid">
      <Detail name="Application number" value={record.application_number} /><Detail name="App fee number" value={record.app_fee_number} /><Detail name="Packet type" value={label(record.packet_type)} /><Detail name="Stage" value={label(record.stage)} />
      <Detail name="Law exam" value={record.law_exam_scheduled_at} /><Detail name="Trade exam" value={record.trade_exam_scheduled_at} /><Detail name="License number" value={record.license_number} /><Detail name="Last synchronized" value={record.synced_at} />
    </dl></section>
    <section className="student-section-card"><header><div><h2>Customer</h2><p>Contact information for the linked student record.</p></div></header><dl className="student-definition-grid"><Detail name="Name" value={record.customer_name} /><Detail name="Email" value={record.customer_email} /><Detail name="Phone" value={record.customer_phone} /><Detail name="Source student ID" value={record.source_student_id} /></dl></section>
  </div>;
}

function RecordError({ message }: { message: string }) {
  return <div className="student-workspace"><Link className="student-back" href="/staff">← Back to Staff Hub</Link><div className="student-error" role="alert"><strong>Record unavailable.</strong><span>{message}</span></div></div>;
}
