"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type MutableRefObject } from "react";
import { createEnrollmentOrder, createEnrollmentQuote, getEnrollmentOptions } from "../../lib/staff-enrollment-api";
import type { CardTokenizationConfig, EnrollmentAddress, EnrollmentOptions, EnrollmentOrderResult, EnrollmentPayment, EnrollmentQuote } from "../../lib/staff-enrollments";
import { StaffApiError } from "../../lib/staff-api";

declare global {
  interface Window {
    Accept?: { dispatchData: (data: unknown, callback: (response: AcceptResponse) => void) => void };
  }
}

interface AcceptResponse {
  opaqueData?: { dataDescriptor: string; dataValue: string };
  messages?: { resultCode?: string; message?: Array<{ code?: string; text?: string }> };
}

const blankAddress: EnrollmentAddress = { first_name: "", last_name: "", company: "", line1: "", line2: "", city: "", state: "", zip: "" };

function readableError(caught: unknown) {
  return caught instanceof StaffApiError ? caught.message : "The enrollment service is temporarily unavailable. Please retry.";
}

function loadAcceptScript(config: CardTokenizationConfig) {
  if (window.Accept) return Promise.resolve();
  if (!config.enabled || !config.script_url) return Promise.reject(new Error("Card processing is not configured."));
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${config.script_url}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("The secure card form could not load.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = config.script_url!;
    script.async = true;
    script.dataset.staffPaymentTokenization = "authorize-net";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The secure card form could not load."));
    document.head.appendChild(script);
  });
}

function tokenizeCard(config: CardTokenizationConfig, fields: CardFieldRefs): Promise<EnrollmentPayment> {
  return loadAcceptScript(config).then(() => new Promise((resolve, reject) => {
    if (!window.Accept || !config.login_id || !config.client_key) {
      reject(new Error("Card processing is not configured."));
      return;
    }
    window.Accept.dispatchData({
      authData: { apiLoginID: config.login_id, clientKey: config.client_key },
      cardData: {
        cardNumber: fields.number.current?.value.replace(/\s/g, "") ?? "",
        month: fields.month.current?.value ?? "",
        year: fields.year.current?.value ?? "",
        cardCode: fields.code.current?.value ?? "",
      },
    }, (response) => {
      if (response.messages?.resultCode === "Ok" && response.opaqueData) {
        resolve({ method: "card", opaque_data_descriptor: response.opaqueData.dataDescriptor, opaque_data_value: response.opaqueData.dataValue });
        return;
      }
      reject(new Error(response.messages?.message?.[0]?.text ?? "The secure card details could not be tokenized."));
    });
  }));
}

interface CardFieldRefs {
  number: MutableRefObject<HTMLInputElement | null>;
  month: MutableRefObject<HTMLInputElement | null>;
  year: MutableRefObject<HTMLInputElement | null>;
  code: MutableRefObject<HTMLInputElement | null>;
}

function AddressFields({ title, value, onChange }: { title: string; value: EnrollmentAddress; onChange: (value: EnrollmentAddress) => void }) {
  const change = (field: keyof EnrollmentAddress, next: string) => onChange({ ...value, [field]: field === "state" ? next.toUpperCase() : next });
  return <fieldset className="enrollment-address"><legend>{title}</legend><div className="enrollment-grid">
    <label className="student-field"><span>First name</span><input required value={value.first_name} onChange={(event) => change("first_name", event.target.value)} /></label>
    <label className="student-field"><span>Last name</span><input required value={value.last_name} onChange={(event) => change("last_name", event.target.value)} /></label>
    <label className="student-field enrollment-span-2"><span>Company</span><input value={value.company} onChange={(event) => change("company", event.target.value)} /></label>
    <label className="student-field enrollment-span-2"><span>Address line 1</span><input required value={value.line1} onChange={(event) => change("line1", event.target.value)} /></label>
    <label className="student-field enrollment-span-2"><span>Address line 2</span><input value={value.line2} onChange={(event) => change("line2", event.target.value)} /></label>
    <label className="student-field"><span>City</span><input required value={value.city} onChange={(event) => change("city", event.target.value)} /></label>
    <label className="student-field"><span>State</span><input required maxLength={2} value={value.state} onChange={(event) => change("state", event.target.value)} /></label>
    <label className="student-field"><span>ZIP</span><input required inputMode="numeric" value={value.zip} onChange={(event) => change("zip", event.target.value)} /></label>
  </div></fieldset>;
}

export function EnrollmentWorkspace() {
  const [customerId, setCustomerId] = useState("");
  const [options, setOptions] = useState<EnrollmentOptions | null>(null);
  const [sku, setSku] = useState("");
  const [classificationId, setClassificationId] = useState("");
  const [shippingMethod, setShippingMethod] = useState("ground");
  const [discountType, setDiscountType] = useState("none");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState("");
  const [quote, setQuote] = useState<EnrollmentQuote | null>(null);
  const [billing, setBilling] = useState<EnrollmentAddress>(blankAddress);
  const [shipping, setShipping] = useState<EnrollmentAddress>(blankAddress);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"card" | "check" | "cash">("check");
  const [bankName, setBankName] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [cashAcknowledged, setCashAcknowledged] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<EnrollmentOrderResult | null>(null);
  const idempotencyRef = useRef("");
  const cardNumberRef = useRef<HTMLInputElement>(null);
  const cardMonthRef = useRef<HTMLInputElement>(null);
  const cardYearRef = useRef<HTMLInputElement>(null);
  const cardCodeRef = useRef<HTMLInputElement>(null);

  function invalidateQuote() { setQuote(null); idempotencyRef.current = ""; setResult(null); }

  async function loadCustomer(event: FormEvent) {
    event.preventDefault();
    const id = Number(customerId);
    if (!Number.isInteger(id) || id < 1) { setError("Enter a valid customer ID."); return; }
    setPending(true); setError(""); setResult(null);
    try {
      const response = await getEnrollmentOptions(id);
      const next = response.data;
      setOptions(next);
      const address = { first_name: next.customer.first_name, last_name: next.customer.last_name, company: next.customer.company, ...next.customer.address };
      setBilling(address); setShipping(address); setSameAsBilling(true);
      setSku(next.products[0]?.sku ?? ""); setClassificationId(String(next.classifications[0]?.id ?? ""));
      setShippingMethod(next.products[0]?.requires_shipping ? "ground" : "none");
      invalidateQuote();
    } catch (caught) { setOptions(null); setError(readableError(caught)); }
    finally { setPending(false); }
  }

  async function calculateQuote(event: FormEvent) {
    event.preventDefault();
    if (!options) return;
    setPending(true); setError(""); setResult(null);
    try {
      const response = await createEnrollmentQuote({
        customer_id: options.customer.id,
        sku,
        classification_id: Number(classificationId),
        shipping_method: shippingMethod,
        discount: { type: discountType, ...(discountType !== "none" ? { value: Number(discountValue), reason: discountReason.trim() } : {}) },
      });
      setQuote(response.data); idempotencyRef.current = crypto.randomUUID();
    } catch (caught) { setQuote(null); setError(readableError(caught)); }
    finally { setPending(false); }
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!quote || !options) { setError("Calculate a current quote before processing the order."); return; }
    setPending(true); setError("");
    try {
      let payment: EnrollmentPayment;
      if (paymentMethod === "card") payment = await tokenizeCard(options.card_tokenization, { number: cardNumberRef, month: cardMonthRef, year: cardYearRef, code: cardCodeRef });
      else if (paymentMethod === "check") payment = { method: "check", bank_name: bankName.trim(), check_number: checkNumber.trim() };
      else payment = { method: "cash", cash_acknowledged: cashAcknowledged as true };
      const response = await createEnrollmentOrder({
        quote_id: quote.id,
        idempotency_key: idempotencyRef.current || crypto.randomUUID(),
        payment,
        billing,
        shipping: sameAsBilling ? billing : shipping,
        order_instructions: instructions.trim(),
      });
      setResult(response.data);
      for (const field of [cardNumberRef, cardMonthRef, cardYearRef, cardCodeRef]) if (field.current) field.current.value = "";
    } catch (caught) {
      setError(readableError(caught));
      if (!(caught instanceof StaffApiError) || !["PAYMENT_IN_PROGRESS", "PAYMENT_RECONCILIATION_REQUIRED"].includes(caught.code)) idempotencyRef.current = crypto.randomUUID();
    } finally { setPending(false); }
  }

  const selectedProduct = options?.products.find((product) => product.sku === sku);
  const cardAvailable = Boolean(options?.card_tokenization.enabled);

  if (result) return <div className="student-workspace enrollment-workspace"><section className="enrollment-success" role="status"><span aria-hidden="true">✓</span><p className="eyebrow">Payment recorded</p><h1>Order #{result.order_id} created</h1><p>{result.sku} · {result.classification} · ${result.total}</p><div><Link className="primary-button" href={`/staff/orders/${result.order_id}`}>Open order</Link><Link className="secondary-button" href="/staff/new_order">View fulfillment queue</Link></div></section></div>;

  return <div className="student-workspace enrollment-workspace">
    <header className="student-page-header"><div><p className="eyebrow">Staff enrollment</p><h1>Create customer order</h1><p>Price from live inventory, apply an authorized discount, confirm both addresses, and record payment securely.</p></div><span className="enrollment-security-chip">Tokenized card handling</span></header>
    {error ? <div className="student-error" role="alert"><strong>Order not processed.</strong><span>{error}</span><button className="text-button" type="button" onClick={() => setError("")}>Dismiss</button></div> : null}

    <form className="enrollment-customer-card" onSubmit={loadCustomer}><label className="student-field"><span>Customer ID</span><input inputMode="numeric" value={customerId} onChange={(event) => setCustomerId(event.target.value.replace(/\D/g, ""))} placeholder="Example: 48219" /></label><button className="primary-button" type="submit" disabled={pending}>{pending && !options ? "Loading…" : "Load customer"}</button>{options ? <div className="enrollment-customer-summary"><strong>{options.customer.first_name} {options.customer.last_name}</strong><span>{options.customer.email} · {options.customer.phone}</span></div> : null}</form>

    {options ? <>
      <form className="enrollment-layout" onSubmit={calculateQuote}>
        <section className="student-section-card"><header><div><p className="eyebrow">1 · Product</p><h2>Enrollment selection</h2></div></header><div className="enrollment-grid">
          <label className="student-field enrollment-span-2"><span>SKU</span><select required value={sku} onChange={(event) => { const next = event.target.value; setSku(next); const product = options.products.find((item) => item.sku === next); setShippingMethod(product?.requires_shipping ? "ground" : "none"); invalidateQuote(); }}>{options.products.map((product) => <option key={product.sku} value={product.sku}>{product.sku} · {product.name} · ${product.price}</option>)}</select></label>
          <label className="student-field enrollment-span-2"><span>Classification</span><select required value={classificationId} onChange={(event) => { setClassificationId(event.target.value); invalidateQuote(); }}>{options.classifications.map((classification) => <option key={classification.id} value={classification.id}>{classification.code} · {classification.name}</option>)}</select></label>
          <label className="student-field"><span>Shipping method</span><select value={selectedProduct?.requires_shipping ? shippingMethod : "none"} disabled={!selectedProduct?.requires_shipping} onChange={(event) => { setShippingMethod(event.target.value); invalidateQuote(); }}>{options.shipping_methods.map((method) => <option key={method.id} value={method.id}>{method.label} · ${method.price}</option>)}</select></label>
        </div></section>
        <section className="student-section-card"><header><div><p className="eyebrow">2 · Discount</p><h2>Authorized adjustment</h2></div><small>Limit: {options.maximum_discount_percent}%</small></header><div className="enrollment-grid">
          <label className="student-field"><span>Discount</span><select value={discountType} onChange={(event) => { setDiscountType(event.target.value); invalidateQuote(); }}><option value="none">No discount</option><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select></label>
          {discountType !== "none" ? <><label className="student-field"><span>{discountType === "percent" ? "Percent" : "Amount"}</span><input required min="0" step="0.01" type="number" value={discountValue} onChange={(event) => { setDiscountValue(event.target.value); invalidateQuote(); }} /></label><label className="student-field enrollment-span-2"><span>Reason</span><input required minLength={5} value={discountReason} onChange={(event) => { setDiscountReason(event.target.value); invalidateQuote(); }} placeholder="Required for the audit record" /></label></> : null}
        </div><button className="primary-button enrollment-quote-button" type="submit" disabled={pending || !sku || !classificationId}>{pending ? "Calculating…" : "Calculate secure quote"}</button></section>
      </form>

      {quote ? <form className="enrollment-checkout" onSubmit={submitOrder}>
        <div className="enrollment-addresses"><AddressFields title="Billing information" value={billing} onChange={(value) => { setBilling(value); if (sameAsBilling) setShipping(value); }} /><label className="enrollment-same-address"><input type="checkbox" checked={sameAsBilling} onChange={(event) => { setSameAsBilling(event.target.checked); if (event.target.checked) setShipping(billing); }} /> Shipping address is the same as billing</label>{!sameAsBilling ? <AddressFields title="Shipping information" value={shipping} onChange={setShipping} /> : null}</div>
        <aside className="enrollment-payment-card"><p className="eyebrow">3 · Payment</p><h2>Process ${quote.amounts.total}</h2><dl className="enrollment-totals"><div><dt>List subtotal</dt><dd>${quote.amounts.list_subtotal}</dd></div><div><dt>Discount</dt><dd>−${quote.amounts.discount}</dd></div><div><dt>Subtotal</dt><dd>${quote.amounts.subtotal}</dd></div><div><dt>Tax</dt><dd>${quote.amounts.tax}</dd></div><div><dt>Shipping</dt><dd>${quote.amounts.shipping}</dd></div><div className="total"><dt>Total</dt><dd>${quote.amounts.total}</dd></div></dl>
          <fieldset className="enrollment-payment-methods"><legend>Payment method</legend>{options.payment_methods.map((method) => <label key={method.id} className={!method.enabled ? "disabled" : ""}><input type="radio" name="payment-method" value={method.id} checked={paymentMethod === method.id} disabled={!method.enabled} onChange={() => setPaymentMethod(method.id)} />{method.label}{method.id === "card" && !method.enabled ? <small>Not configured</small> : null}</label>)}</fieldset>
          {paymentMethod === "check" ? <div className="enrollment-grid"><label className="student-field"><span>Bank name</span><input required value={bankName} onChange={(event) => setBankName(event.target.value)} /></label><label className="student-field"><span>Check number</span><input required value={checkNumber} onChange={(event) => setCheckNumber(event.target.value.replace(/[^A-Za-z0-9-]/g, ""))} /></label></div> : null}
          {paymentMethod === "cash" ? <div className="enrollment-cash-confirm"><input id="cash-received" required type="checkbox" checked={cashAcknowledged} onChange={(event) => setCashAcknowledged(event.target.checked)} /><label htmlFor="cash-received"><strong>Cash received</strong><small>I confirm the displayed total was received.</small></label></div> : null}
          {paymentMethod === "card" && cardAvailable ? <div className="enrollment-card-fields"><p>Card details go directly to Authorize.Net and are replaced with a single-use token.</p><label className="student-field enrollment-span-2"><span>Card number</span><input ref={cardNumberRef} required inputMode="numeric" autoComplete="cc-number" /></label><label className="student-field"><span>Expiration month</span><input ref={cardMonthRef} required inputMode="numeric" maxLength={2} autoComplete="cc-exp-month" placeholder="MM" /></label><label className="student-field"><span>Expiration year</span><input ref={cardYearRef} required inputMode="numeric" maxLength={4} autoComplete="cc-exp-year" placeholder="YYYY" /></label><label className="student-field"><span>Security code</span><input ref={cardCodeRef} required type="password" inputMode="numeric" maxLength={4} autoComplete="cc-csc" /></label></div> : null}
          <label className="student-field"><span>Order instructions</span><textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          <div className="enrollment-payment-warning"><strong>Final action</strong><span>Submitting can charge the customer and create a fulfillment order. Do not refresh or retry while processing.</span></div>
          <button className="primary-button enrollment-process-button" type="submit" disabled={pending}>{pending ? "Processing securely…" : `Process ${paymentMethod} order · $${quote.amounts.total}`}</button>
        </aside>
      </form> : null}
    </> : null}
  </div>;
}
