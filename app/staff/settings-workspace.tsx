"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  createAgreement,
  createClassLocation,
  createFirewallEntry,
  createOffice,
  createSku,
  createValidIp,
  deleteClassLocation,
  deleteFirewallEntry,
  deleteOffice,
  deleteValidIp,
  getCheckoutVisibility,
  getProfile,
  listAgreements,
  listClassLocations,
  listFirewallEntries,
  listOffices,
  listSkus,
  listValidIps,
  updateAgreement,
  updateCheckoutVisibility,
  updateClassLocation,
  updateFirewallEntry,
  updateOffice,
  updatePassword,
  updateProfile,
  updateSku,
} from "../../lib/staff-settings-api";
import type {
  CheckoutVisibility,
  ClassLocation,
  EnrollmentAgreement,
  FirewallEntry,
  FirstTimeOption,
  OfficeLocation,
  StaffProfileSettings,
  StaffSku,
  ValidIp,
} from "../../lib/staff-settings";
import { StaffApiError } from "../../lib/staff-api";

type SettingsTab = "profile" | "locations" | "access" | "checkout" | "catalog" | "agreements";

const blankProfile: StaffProfileSettings = { id: 0, username: "", name: "", last_name: "", email: "", mail_form_name: "", signature: "" };
const blankCheckout: CheckoutVisibility = { customer_checkout: { google_pay: true, apple_pay: true, paypal: true }, staff_checkout: { card: true, check: true, cash: true } };

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`settings-field ${wide ? "wide" : ""}`}><span>{label}</span>{children}</label>;
}

function SettingSwitch({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="settings-switch"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Empty({ children }: { children: ReactNode }) { return <p className="settings-empty">{children}</p>; }

export function SettingsWorkspace({ profileOnly, onSessionExpired }: { profileOnly?: boolean; onSessionExpired: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState(blankProfile);
  const [offices, setOffices] = useState<OfficeLocation[]>([]);
  const [classes, setClasses] = useState<ClassLocation[]>([]);
  const [validIps, setValidIps] = useState<ValidIp[]>([]);
  const [firewall, setFirewall] = useState<FirewallEntry[]>([]);
  const [currentIp, setCurrentIp] = useState("");
  const [checkout, setCheckout] = useState(blankCheckout);
  const [skus, setSkus] = useState<StaffSku[]>([]);
  const [agreements, setAgreements] = useState<EnrollmentAgreement[]>([]);
  const [firstTimes, setFirstTimes] = useState<FirstTimeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [editingOffice, setEditingOffice] = useState<OfficeLocation | null>(null);
  const [editingClass, setEditingClass] = useState<ClassLocation | null>(null);

  function fail(caught: unknown) {
    if (caught instanceof StaffApiError && caught.status === 401) { onSessionExpired(); return; }
    setError(caught instanceof StaffApiError ? caught.message : "The settings service is temporarily unavailable. Please retry.");
  }

  async function refresh() {
    setLoading(true); setError("");
    try {
      const profileResult = await getProfile();
      setProfile(profileResult.data);
      if (!profileOnly) {
        const [officeResult, classResult, ipResult, firewallResult, checkoutResult, skuResult, agreementResult] = await Promise.all([
          listOffices(), listClassLocations(), listValidIps(), listFirewallEntries(), getCheckoutVisibility(), listSkus(), listAgreements(),
        ]);
        setOffices(officeResult.data.items); setClasses(classResult.data.items); setValidIps(ipResult.data.items);
        setFirewall(firewallResult.data.items); setCurrentIp(firewallResult.data.current_ip); setCheckout(checkoutResult.data);
        setSkus(skuResult.data.items); setAgreements(agreementResult.data.items); setFirstTimes(agreementResult.data.first_time_options);
      }
    } catch (caught) { fail(caught); } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
    // The route mode is immutable for a mounted workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileOnly]);

  async function action(work: () => Promise<{ message: string }>, after?: () => Promise<void> | void) {
    setPending(true); setError(""); setNotice("");
    try { const result = await work(); await after?.(); setNotice(result.message); }
    catch (caught) { fail(caught); }
    finally { setPending(false); }
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void action(() => updateProfile({ name: profile.name, last_name: profile.last_name, email: profile.email, mail_form_name: profile.mail_form_name, signature: profile.signature }), async () => {
      const result = await getProfile(); setProfile(result.data);
    });
  }

  function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void action(() => updatePassword({ current_password: String(data.get("current_password") ?? ""), new_password: String(data.get("new_password") ?? ""), new_password_confirmation: String(data.get("new_password_confirmation") ?? "") }), () => form.reset());
  }

  function saveOffice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const input = { address: String(data.get("address")), city: String(data.get("city")), state: String(data.get("state")).toUpperCase(), zip: String(data.get("zip")), sales_tax: Number(data.get("sales_tax") || 0), phone: String(data.get("phone") || ""), email: String(data.get("email") || "") };
    void action(() => editingOffice ? updateOffice(editingOffice.id, input) : createOffice(input), async () => { setEditingOffice(null); form.reset(); setOffices((await listOffices()).data.items); });
  }

  function saveClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const input = { Cities: String(data.get("name")), Room: String(data.get("room")), Address: String(data.get("address") || ""), City: String(data.get("city") || ""), State: String(data.get("state") || "").toUpperCase(), Zip: String(data.get("zip") || ""), Trade_Time: String(data.get("trade_time") || ""), Law_Time: String(data.get("law_time") || ""), max_size: Number(data.get("max_size") || 1), es: data.get("spanish") === "on" };
    void action(() => editingClass ? updateClassLocation(editingClass.id, input) : createClassLocation(input), async () => { setEditingClass(null); form.reset(); setClasses((await listClassLocations()).data.items); });
  }

  function addIp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void action(() => createValidIp(String(data.get("ip") || "")), async () => { form.reset(); setValidIps((await listValidIps()).data.items); });
  }

  function addFirewall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void action(() => createFirewallEntry(String(data.get("ip_address") || ""), data.get("mode") === "allow"), async () => { form.reset(); const result = await listFirewallEntries(); setFirewall(result.data.items); setCurrentIp(result.data.current_ip); });
  }

  function saveSku(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const input = { sku: String(data.get("sku")), name: String(data.get("name")), staff_name: String(data.get("staff_name") || ""), description: String(data.get("description") || ""), subtotal: String(data.get("subtotal")), sales_tax: String(data.get("sales_tax") || "0"), active: true, staff_visible: data.get("staff_visible") === "on", requires_shipping: data.get("requires_shipping") === "on", popular: false };
    void action(() => createSku(input), async () => { form.reset(); setSkus((await listSkus()).data.items); });
  }

  function saveAgreement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const input = { first_time: String(data.get("first_time")), revision_date: String(data.get("revision_date")), body: String(data.get("body")), active: data.get("active") === "on" };
    void action(() => createAgreement(input), async () => { form.reset(); const result = await listAgreements(); setAgreements(result.data.items); setFirstTimes(result.data.first_time_options); });
  }

  const tabs: Array<{ key: SettingsTab; label: string }> = profileOnly ? [{ key: "profile", label: "Profile" }] : [
    { key: "profile", label: "Profile" }, { key: "locations", label: "Locations" }, { key: "access", label: "Access security" },
    { key: "checkout", label: "Checkout" }, { key: "catalog", label: "SKU catalog" }, { key: "agreements", label: "Agreements" },
  ];

  return <div className="content-wrap settings-workspace">
    <header className="page-heading settings-heading"><div><p className="eyebrow">Staff administration</p><h1>{profileOnly ? "Your profile" : "Settings & security"}</h1><p>{profileOnly ? "Keep your contact details, signature, and password current." : "Manage locations, network access, checkout visibility, products, and agreement versions."}</p></div><span className="settings-security-mark" aria-label="Audited settings">SEC</span></header>
    {!profileOnly ? <nav className="settings-tabs" aria-label="Settings sections">{tabs.map((tab) => <button key={tab.key} type="button" className={activeTab === tab.key ? "active" : ""} onClick={() => setActiveTab(tab.key)} aria-current={activeTab === tab.key ? "page" : undefined}>{tab.label}</button>)}</nav> : null}
    {notice ? <div className="settings-alert success" role="status">{notice}</div> : null}
    {error ? <div className="settings-alert" role="alert"><strong>Couldn’t complete that change.</strong> {error}<button type="button" onClick={() => void refresh()}>Retry</button></div> : null}
    {loading ? <div className="settings-loading" role="status">Loading secure settings…</div> : null}

    {!loading && activeTab === "profile" ? <div className="settings-columns">
      <form className="settings-card" onSubmit={saveProfile}><header><div><h2>Profile details</h2><p>Used across staff communications and internal records.</p></div><span>Personal</span></header><div className="settings-form-grid">
        <Field label="Username"><input value={profile.username} disabled /></Field>
        <Field label="Email"><input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} required /></Field>
        <Field label="First name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></Field>
        <Field label="Last name"><input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} /></Field>
        <Field label="Email display name" wide><input value={profile.mail_form_name} onChange={(e) => setProfile({ ...profile, mail_form_name: e.target.value })} /></Field>
        <Field label="Email signature" wide><textarea value={profile.signature} onChange={(e) => setProfile({ ...profile, signature: e.target.value })} rows={5} /></Field>
      </div><footer><button className="primary-button compact" disabled={pending}>Save profile</button></footer></form>
      <form className="settings-card" onSubmit={savePassword}><header><div><h2>Password & sessions</h2><p>Changing your password signs out every other Staff Hub session.</p></div><span>Security</span></header><div className="settings-form-stack">
        <Field label="Current password"><input name="current_password" type="password" autoComplete="current-password" required /></Field>
        <Field label="New password"><input name="new_password" type="password" autoComplete="new-password" minLength={12} required /></Field>
        <Field label="Confirm new password"><input name="new_password_confirmation" type="password" autoComplete="new-password" minLength={12} required /></Field>
        <p className="settings-help">Use at least 12 characters. Password values are never stored in browser storage or audit logs.</p>
      </div><footer><button className="secondary-button" disabled={pending}>Update password</button></footer></form>
    </div> : null}

    {!loading && activeTab === "locations" ? <div className="settings-columns">
      <section className="settings-card"><header><div><h2>Office locations</h2><p>Addresses and tax rates used by staff operations.</p></div><span>{offices.length}</span></header><form className="settings-inline-form" onSubmit={saveOffice} key={editingOffice?.id ?? "new-office"}>
        <Field label="Address" wide><input name="address" defaultValue={editingOffice?.address} required /></Field><Field label="City"><input name="city" defaultValue={editingOffice?.city} required /></Field><Field label="State"><input name="state" defaultValue={editingOffice?.state} maxLength={2} required /></Field><Field label="ZIP"><input name="zip" defaultValue={editingOffice?.zip} required /></Field><Field label="Sales tax"><input name="sales_tax" defaultValue={editingOffice?.sales_tax ?? ""} type="number" min="0" max="1" step="0.00001" /></Field><Field label="Phone"><input name="phone" defaultValue={editingOffice?.phone ?? ""} /></Field><Field label="Email"><input name="email" defaultValue={editingOffice?.email ?? ""} type="email" /></Field><div className="settings-form-actions"><button className="primary-button compact" disabled={pending}>{editingOffice ? "Update office" : "Add office"}</button>{editingOffice ? <button type="button" className="text-button" onClick={() => setEditingOffice(null)}>Cancel</button> : null}</div>
      </form><div className="settings-list">{offices.length ? offices.map((office) => <article key={office.id}><div><strong>{office.city}, {office.state}</strong><span>{office.address} · {office.zip}</span><small>{office.sales_tax === null ? "No tax rate" : `${(office.sales_tax * 100).toFixed(3)}% tax`} {office.phone ? `· ${office.phone}` : ""}</small></div><div><button type="button" onClick={() => setEditingOffice(office)}>Edit</button><button type="button" className="danger-link" onClick={() => void action(() => deleteOffice(office.id), async () => setOffices((await listOffices()).data.items))}>Delete</button></div></article>) : <Empty>No office locations configured.</Empty>}</div></section>
      <section className="settings-card"><header><div><h2>Class locations</h2><p>Classroom, schedule, capacity, and language details.</p></div><span>{classes.length}</span></header><form className="settings-inline-form" onSubmit={saveClass} key={editingClass?.id ?? "new-class"}>
        <Field label="Location name"><input name="name" defaultValue={editingClass?.name} required /></Field><Field label="Room"><input name="room" defaultValue={editingClass?.room} required /></Field><Field label="Address" wide><input name="address" defaultValue={editingClass?.address} /></Field><Field label="City"><input name="city" defaultValue={editingClass?.city} /></Field><Field label="State"><input name="state" defaultValue={editingClass?.state} maxLength={2} /></Field><Field label="ZIP"><input name="zip" defaultValue={editingClass?.zip} /></Field><Field label="Trade time"><input name="trade_time" defaultValue={editingClass?.trade_time} /></Field><Field label="Law time"><input name="law_time" defaultValue={editingClass?.law_time} /></Field><Field label="Capacity"><input name="max_size" defaultValue={editingClass?.max_size ?? ""} type="number" min="1" /></Field><label className="settings-check"><input name="spanish" type="checkbox" defaultChecked={editingClass?.spanish} /> Spanish location</label><div className="settings-form-actions"><button className="primary-button compact" disabled={pending}>{editingClass ? "Update class location" : "Add class location"}</button>{editingClass ? <button type="button" className="text-button" onClick={() => setEditingClass(null)}>Cancel</button> : null}</div>
      </form><div className="settings-list">{classes.length ? classes.map((item) => <article key={item.id}><div><strong>{item.name}</strong><span>{item.room} · {item.city || "City not set"}, {item.state || "—"}</span><small>{item.max_size ? `${item.max_size} seats` : "Capacity not set"}{item.spanish ? " · Spanish" : ""}</small></div><div><button type="button" onClick={() => setEditingClass(item)}>Edit</button><button type="button" className="danger-link" onClick={() => void action(() => deleteClassLocation(item.id), async () => setClasses((await listClassLocations()).data.items))}>Delete</button></div></article>) : <Empty>No class locations configured.</Empty>}</div></section>
    </div> : null}

    {!loading && activeTab === "access" ? <div className="settings-columns">
      <section className="settings-card"><header><div><h2>Approved office IPs</h2><p>Office-network addresses that can sign in without an OTP.</p></div><span>{validIps.length}</span></header><form className="settings-add-row" onSubmit={addIp}><Field label="IP address"><input name="ip" placeholder="203.0.113.10" required /></Field><button className="primary-button compact" disabled={pending}>Add approved IP</button></form><div className="settings-list compact-list">{validIps.map((item) => <article key={item.id}><div><strong>{item.ip}</strong><small>{item.ip === currentIp ? "Current session IP" : "Approved office network"}</small></div><button type="button" className="danger-link" disabled={item.ip === currentIp || pending} onClick={() => void action(() => deleteValidIp(item.id), async () => setValidIps((await listValidIps()).data.items))}>Remove</button></article>)}</div></section>
      <section className="settings-card"><header><div><h2>Firewall rules</h2><p>Explicit allow and block rules. Your current IP cannot be blocked.</p></div><span>{firewall.length}</span></header><div className="current-ip-note">Current session IP <strong>{currentIp || "Unavailable"}</strong></div><form className="settings-add-row" onSubmit={addFirewall}><Field label="IPv4 address"><input name="ip_address" placeholder="198.51.100.42" required /></Field><Field label="Rule"><select name="mode"><option value="block">Block</option><option value="allow">Allow</option></select></Field><button className="primary-button compact" disabled={pending}>Add rule</button></form><div className="settings-list compact-list">{firewall.map((item) => <article key={item.id}><div><strong>{item.ip_address}</strong><small className={item.whitelisted ? "allow" : "block"}>{item.whitelisted ? "Allowed" : "Blocked"}</small></div><div><button type="button" disabled={item.ip_address === currentIp || pending} onClick={() => void action(() => updateFirewallEntry(item.id, { whitelisted: !item.whitelisted }), async () => { const result = await listFirewallEntries(); setFirewall(result.data.items); })}>{item.whitelisted ? "Block" : "Allow"}</button><button type="button" className="danger-link" disabled={item.ip_address === currentIp || pending} onClick={() => void action(() => deleteFirewallEntry(item.id), async () => { const result = await listFirewallEntries(); setFirewall(result.data.items); })}>Delete</button></div></article>)}</div></section>
    </div> : null}

    {!loading && activeTab === "checkout" ? <section className="settings-card settings-single-card"><header><div><h2>Payment-method visibility</h2><p>Controls what customers and staff can select. Staff choices are also enforced by Laravel during order creation.</p></div><span>Live</span></header><div className="settings-toggle-columns"><div><h3>Customer checkout</h3><SettingSwitch label="Google Pay" detail="Show wallet option to customers" checked={checkout.customer_checkout.google_pay} onChange={(v) => setCheckout({ ...checkout, customer_checkout: { ...checkout.customer_checkout, google_pay: v } })} /><SettingSwitch label="Apple Pay" detail="Show wallet option to customers" checked={checkout.customer_checkout.apple_pay} onChange={(v) => setCheckout({ ...checkout, customer_checkout: { ...checkout.customer_checkout, apple_pay: v } })} /><SettingSwitch label="PayPal" detail="Show PayPal to customers" checked={checkout.customer_checkout.paypal} onChange={(v) => setCheckout({ ...checkout, customer_checkout: { ...checkout.customer_checkout, paypal: v } })} /></div><div><h3>Staff enrollment checkout</h3><SettingSwitch label="Credit or debit card" detail="Authorize.Net tokenized card payment" checked={checkout.staff_checkout.card} onChange={(v) => setCheckout({ ...checkout, staff_checkout: { ...checkout.staff_checkout, card: v } })} /><SettingSwitch label="Check" detail="Record a check payment" checked={checkout.staff_checkout.check} onChange={(v) => setCheckout({ ...checkout, staff_checkout: { ...checkout.staff_checkout, check: v } })} /><SettingSwitch label="Cash" detail="Record an in-person cash payment" checked={checkout.staff_checkout.cash} onChange={(v) => setCheckout({ ...checkout, staff_checkout: { ...checkout.staff_checkout, cash: v } })} /></div></div><footer><p>At least one Staff Hub payment method must remain enabled.</p><button className="primary-button compact" type="button" disabled={pending} onClick={() => void action(() => updateCheckoutVisibility(checkout), async () => setCheckout((await getCheckoutVisibility()).data))}>Save payment visibility</button></footer></section> : null}

    {!loading && activeTab === "catalog" ? <section className="settings-card settings-single-card"><header><div><h2>SKU catalog</h2><p>Create staff products and archive retired offerings without deleting order history.</p></div><span>{skus.filter((sku) => sku.active).length} active</span></header><form className="settings-inline-form sku-form" onSubmit={saveSku}><Field label="SKU"><input name="sku" required /></Field><Field label="Customer name"><input name="name" required /></Field><Field label="Staff name"><input name="staff_name" /></Field><Field label="Subtotal"><input name="subtotal" type="number" min="0" step="0.01" required /></Field><Field label="Sales tax"><input name="sales_tax" type="number" min="0" step="0.01" defaultValue="0" /></Field><Field label="Description" wide><textarea name="description" rows={3} /></Field><label className="settings-check"><input name="staff_visible" type="checkbox" defaultChecked /> Staff visible</label><label className="settings-check"><input name="requires_shipping" type="checkbox" defaultChecked /> Requires shipping</label><div className="settings-form-actions"><button className="primary-button compact" disabled={pending}>Create SKU</button></div></form><div className="settings-table-wrap"><table className="settings-table"><thead><tr><th>SKU</th><th>Product</th><th>Price</th><th>Staff</th><th>Status</th><th>Actions</th></tr></thead><tbody>{skus.map((sku) => <tr key={sku.id}><td><strong>{sku.sku}</strong></td><td>{sku.staff_name || sku.name}<small>{sku.requires_shipping ? "Ships" : "Digital / no shipping"}</small></td><td>${sku.subtotal}</td><td>{sku.staff_visible ? "Visible" : "Hidden"}</td><td><span className={`settings-status ${sku.active ? "active" : "inactive"}`}>{sku.active ? "Active" : "Archived"}</span></td><td><button type="button" disabled={pending} onClick={() => void action(() => updateSku(sku.id, { staff_visible: !sku.staff_visible }), async () => setSkus((await listSkus()).data.items))}>{sku.staff_visible ? "Hide" : "Show"}</button>{sku.active ? <button type="button" className="danger-link" disabled={pending} onClick={() => void action(() => updateSku(sku.id, { active: false, staff_visible: false }), async () => setSkus((await listSkus()).data.items))}>Archive</button> : null}</td></tr>)}</tbody></table></div></section> : null}

    {!loading && activeTab === "agreements" ? <section className="settings-card settings-single-card"><header><div><h2>Enrollment agreements</h2><p>Publish versioned agreement text by enrollment type. Activating a version retires the previous active version.</p></div><span>{agreements.filter((item) => item.active).length} active</span></header><form className="settings-inline-form agreement-form" onSubmit={saveAgreement}><Field label="Enrollment type"><select name="first_time" required>{firstTimes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><Field label="Revision date"><input name="revision_date" type="date" required /></Field><label className="settings-check"><input name="active" type="checkbox" /> Activate immediately</label><Field label="Agreement body" wide><textarea name="body" rows={10} required /></Field><div className="settings-form-actions"><button className="primary-button compact" disabled={pending}>Create agreement version</button></div></form><div className="settings-list agreements-list">{agreements.map((item) => <article key={item.id}><div><strong>{firstTimes.find((option) => option.value === item.first_time)?.label ?? item.first_time}</strong><span>Revision {item.revision_date}</span><small>{item.body.slice(0, 150)}{item.body.length > 150 ? "…" : ""}</small></div><div><span className={`settings-status ${item.active ? "active" : "inactive"}`}>{item.active ? "Active" : "Inactive"}</span>{!item.active ? <button type="button" disabled={pending} onClick={() => void action(() => updateAgreement(item.id, { first_time: item.first_time, revision_date: item.revision_date, body: item.body, active: true }), async () => { const result = await listAgreements(); setAgreements(result.data.items); })}>Activate</button> : null}</div></article>)}</div></section> : null}
  </div>;
}
