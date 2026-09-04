import {
  createFixturePrincipal,
  fixtureChallenge,
  fixtureLoginError,
  isFixtureAuthEnabled,
  isPersonaKey,
} from "./staff-fixtures";
import { fixtureStudent, studentFixtures } from "./student-fixtures";
import { customerDeviceFixtures } from "./customer-device-fixtures";
import { newOrderFixtures, salespersonFixtures } from "./new-order-fixtures";
import { brochureFixtures, brochureOptionsFixture, brochureTemplateFixtures } from "./brochure-fixtures";
import type { BrochureInput, BrochureTemplateInput } from "./brochures";
import type { NewOrderInput } from "./new-orders";
import type { StaffApiErrorBody, StaffAuthErrorCode, StaffPrincipal } from "./staff";
import type { StudentInput } from "./students";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
};
const TOKEN_COOKIE = "cis_staff_token";

const fixtureProfiles = new Map<string, { id: number; username: string; name: string; last_name: string; email: string; mail_form_name: string; signature: string }>();
let fixtureOffices = [{ id: 1, address: "1330 Spring Street", city: "Paso Robles", state: "CA", zip: "93446", sales_tax: 0.0875, phone: "805-555-0110", email: "office@example.test" }];
let fixtureClassLocations = [{ id: 1, name: "Sacramento Weekend", room: "Training Room A", address: "100 Main Street", city: "Sacramento", state: "CA", zip: "95814", trade_time: "8:00 AM", law_time: "1:00 PM", max_size: 40, spanish: false }];
let fixtureValidIps = [{ id: 1, ip: "127.0.0.1" }, { id: 2, ip: "203.0.113.10" }];
let fixtureFirewall: Array<{ id: number; ip_address: string; mode: "allow" | "block"; whitelisted: boolean; created_at: string }> = [{ id: 1, ip_address: "198.51.100.77", mode: "block", whitelisted: false, created_at: "2026-09-01T16:00:00Z" }];
let fixtureCheckout = { customer_checkout: { google_pay: true, apple_pay: true, paypal: true }, staff_checkout: { card: false, check: true, cash: true } };
let fixtureSkus = [
  { id: 1, sku: "KIT-B", name: "B General Building study package", staff_name: "B study kit", description: "Books and online course access.", subtotal: "500.00", sales_tax: "40.00", active: true, staff_visible: true, requires_shipping: true, popular: true },
  { id: 2, sku: "ONLINE-LAW", name: "Law online course", staff_name: "Law online", description: "Online-only course.", subtotal: "295.00", sales_tax: "0.00", active: true, staff_visible: true, requires_shipping: false, popular: false },
];
let fixtureAgreements = [{ id: 1, first_time: "new", revision_date: "2026-08-15", body: "I acknowledge the enrollment terms and cancellation policy.", active: true }];
const fixtureFirstTimes = [{ value: "new", label: "New student" }, { value: "returning", label: "Returning student" }];

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(value, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

function error(
  status: number,
  code: StaffAuthErrorCode,
  message: string,
  attemptsRemaining?: number,
) {
  const body: StaffApiErrorBody = {
    error: { code, message, ...(attemptsRemaining === undefined ? {} : { attemptsRemaining }) },
  };
  return json(body, status);
}

function cookieValue(request: Request, name: string) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

function fixtureCookie(persona: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `cis_staff_fixture=${encodeURIComponent(persona)}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function tokenCookie(token: string, expiresAt: string | null, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const maxAge = Number.isFinite(expiry)
    ? Math.max(0, Math.floor((expiry - Date.now()) / 1000))
    : 60 * 60 * 8;
  return `${TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function readFixturePersona(request: Request) {
  const value = cookieValue(request, "cis_staff_fixture");
  return value && isPersonaKey(value) ? value : null;
}

function fixtureList(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const accountType = url.searchParams.get("account_type");
  const accountStatus = url.searchParams.get("account_status");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? 25)));
  const filtered = studentFixtures.filter((student) => {
    const haystack = `${student.name} ${student.lname ?? ""} ${student.email} ${student.mobilenum ?? ""}`.toLowerCase();
    return (
      (!search || haystack.includes(search)) &&
      (!accountType || String(student.account_type) === accountType) &&
      (!accountStatus || String(student.account_status) === accountStatus)
    );
  });
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  const items = filtered.slice((page - 1) * perPage, page * perPage);
  return json({
    data: { items },
    meta: { pagination: { current_page: page, per_page: perPage, total: filtered.length, last_page: lastPage } },
    message: "Students retrieved successfully.",
  });
}

async function handleFixtureStudents(request: Request, path: string) {
  if (path === "/students" && request.method === "GET") return fixtureList(request);

  if (path === "/students" && request.method === "POST") {
    const input = (await request.json()) as StudentInput;
    const created = { ...studentFixtures[0], ...input, customerid: 49001 };
    return json({ data: created, meta: {}, message: "Student created successfully." }, 201);
  }

  const toggleMatch = path.match(/^\/students\/enable_disable\/(\d+)$/);
  if (toggleMatch && request.method === "POST") {
    const student = fixtureStudent(Number(toggleMatch[1]));
    if (!student) return json({ data: null, meta: {}, message: "Student not found." }, 404);
    return json({ data: { ...student, disabled: !student.disabled }, meta: {}, message: "Student status updated successfully." });
  }

  const pbiaMatch = path.match(/^\/students\/copy-customer-pbia\/(\d+)$/);
  if (pbiaMatch && request.method === "POST") {
    return json({ data: { student_id: Number(pbiaMatch[1]), queue_id: 901, status: "queued" }, meta: {}, message: "PBIA copy queued successfully." }, 202);
  }

  const passwordMatch = path.match(/^\/students\/update-password\/(\d+)$/);
  if (passwordMatch && request.method === "POST") {
    return json({ data: { id: Number(passwordMatch[1]) }, meta: {}, message: "Password updated successfully." });
  }

  const emailMatch = path.match(/^\/students\/(\d+)\/send_email$/);
  if (emailMatch && request.method === "POST") {
    return json({ data: { student_id: Number(emailMatch[1]) }, meta: {}, message: "Email queued successfully." });
  }

  const studentMatch = path.match(/^\/students\/(\d+)$/);
  if (studentMatch) {
    const student = fixtureStudent(Number(studentMatch[1]));
    if (!student) return json({ data: null, meta: {}, message: "Student not found." }, 404);
    if (request.method === "GET") return json({ data: student, meta: {}, message: "Student retrieved successfully." });
    if (request.method === "PATCH" || request.method === "PUT") {
      const input = (await request.json()) as StudentInput;
      return json({ data: { ...student, ...input }, meta: {}, message: "Student updated successfully." });
    }
  }

  return json({ data: null, meta: {}, message: "The requested student operation was not found." }, 404);
}

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function fixtureCustomerDeviceList(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? 25)));
  const filtered = customerDeviceFixtures.filter((device) =>
    !search || `${device.email ?? ""} ${device.ip_address ?? ""} ${device.fingerprint ?? ""}`.toLowerCase().includes(search),
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  return json({
    data: { items: filtered.slice((page - 1) * perPage, page * perPage) },
    meta: { pagination: { current_page: page, per_page: perPage, total: filtered.length, last_page: lastPage } },
    message: "Customer devices retrieved successfully.",
  });
}

function fixtureCustomerDeviceExport(request: Request) {
  const url = new URL(request.url);
  const startDate = url.searchParams.get("start_date") ?? "2026-08-01";
  const endDate = url.searchParams.get("end_date") ?? "2026-09-01";
  const headers = ["Customer ID", "Email", "Device Type", "IP Address", "User Agent", "Location", "Created At"];
  const customerCounts = new Map<number, number>();
  for (const device of customerDeviceFixtures) customerCounts.set(device.customer_id, (customerCounts.get(device.customer_id) ?? 0) + 1);
  const eligibleCustomerIds = new Set(customerDeviceFixtures.filter((device) => {
    const date = device.created_at?.slice(0, 10) ?? "";
    return (customerCounts.get(device.customer_id) ?? 0) > 1 && date >= startDate && date <= endDate;
  }).map((device) => device.customer_id));
  const rows = customerDeviceFixtures.filter((device) => eligibleCustomerIds.has(device.customer_id));
  const csv = [headers, ...rows.map((device) => [device.customer_id, device.email, device.device_type, device.ip_address, device.user_agent, device.location, device.created_at])]
    .map((row) => row.map(csvValue).join(","))
    .join("\n");
  return new Response(csv, {
    status: 200,
    headers: {
      ...NO_STORE_HEADERS,
      "content-type": "text/csv; charset=UTF-8",
      "content-disposition": `attachment; filename="customer_devices_from_${startDate}-to-${endDate}.csv"`,
    },
  });
}

function handleFixtureCustomerDevices(request: Request, path: string) {
  if (path === "/customer-devices/export-customer-devices" && request.method === "GET") return fixtureCustomerDeviceExport(request);
  if (path === "/customer-devices" && request.method === "GET") return fixtureCustomerDeviceList(request);
  const deleteMatch = path.match(/^\/customer-devices\/(\d+)$/);
  if (deleteMatch && request.method === "DELETE") {
    return json({ data: { id: Number(deleteMatch[1]) }, meta: {}, message: "Customer device deleted successfully." });
  }
  return json({ data: null, meta: {}, message: "The requested customer device operation was not found." }, 404);
}

function fixtureNewOrderList(request: Request) {
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? 50)));
  const filtered = newOrderFixtures.filter((order) =>
    !search || `${order.id} ${order.First_name} ${order.Last_name} ${order.cust_email} ${order.phone ?? ""}`.toLowerCase().includes(search),
  );
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  return json({
    data: { items: filtered.slice((page - 1) * perPage, page * perPage) },
    meta: { pagination: { current_page: page, per_page: perPage, total: filtered.length, last_page: lastPage } },
    message: "New orders retrieved successfully.",
  });
}

function fixtureNewOrderPrintDocument(kind: "labels" | "invoices", ids: number[]) {
  const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
  const orders = ids.map((id) => newOrderFixtures.find((order) => order.id === id)).filter((order): order is typeof newOrderFixtures[number] => Boolean(order));
  if (orders.length !== ids.length) return json({ data: null, meta: {}, message: "One or more new orders not found." }, 404);
  const body = kind === "labels"
    ? orders.map((order) => `<section><strong>${escape(`${order.First_name} ${order.Last_name}`)}</strong><br>${escape(order.shipping.address1)} ${escape(order.shipping.address2)}<br>${escape(order.shipping.city)}, ${escape(order.shipping.state)} ${escape(order.shipping.zip)}</section>`).join("")
    : orders.map((order) => `<section><h1>Contractor Institute</h1><h2>Order #${order.id}</h2><p>${escape(`${order.First_name} ${order.Last_name}`)}<br>${escape(order.cust_email)}</p><table>${order.items.map((item) => `<tr><td>${escape(item.description)}</td><td>${escape(item.price)}</td></tr>`).join("")}</table></section>`).join("");
  return new Response(`<!doctype html><html><head><title>New order ${kind}</title><style>body{font:14px Arial,sans-serif;color:#172631}section{page-break-after:always;padding:20px}table{width:100%}td{padding:8px;border-bottom:1px solid #ddd}</style></head><body>${body}</body></html>`, { status: 200, headers: { ...NO_STORE_HEADERS, "content-type": "text/html; charset=UTF-8" } });
}

async function handleFixtureNewOrders(request: Request, path: string) {
  if ((path === "/new_order" || path === "/new_order/ajax_new_order") && request.method === "GET") return fixtureNewOrderList(request);
  if ((path === "/new_order/labels" || path === "/new_order/invoices") && request.method === "POST") {
    const input = (await request.json()) as { ids?: number[] };
    const ids = Array.isArray(input.ids) ? input.ids.map(Number) : [];
    if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) return json({ data: null, meta: {}, message: "Select between 1 and 100 unique orders." }, 422);
    return fixtureNewOrderPrintDocument(path.endsWith("labels") ? "labels" : "invoices", ids);
  }
  if (path === "/new_order/shipped_selected" && request.method === "POST") {
    const input = (await request.json()) as { ids?: number[] };
    const ids = Array.isArray(input.ids) ? input.ids.map(Number) : [];
    return json({ data: { ids, updated: ids.length }, meta: {}, message: "Selected orders marked as shipped." });
  }
  const shippedMatch = path.match(/^\/new_order\/shipped\/(\d+)$/);
  if (shippedMatch && request.method === "POST") return json({ data: { id: Number(shippedMatch[1]), shipped: true }, meta: {}, message: "Order marked as shipped." });
  const orderMatch = path.match(/^\/new_order\/(\d+)$/);
  if (orderMatch) {
    const order = newOrderFixtures.find((entry) => entry.id === Number(orderMatch[1]));
    if (!order) return json({ data: null, meta: {}, message: "Order not found." }, 404);
    if (request.method === "GET") return json({ data: { order, salespeople: salespersonFixtures }, meta: {}, message: "Order retrieved successfully." });
    if (request.method === "PATCH" || request.method === "PUT") {
      const input = (await request.json()) as NewOrderInput;
      const salesperson = salespersonFixtures.find((person) => person.id === input.admin_id);
      const updated = { ...order, First_name: input.first_name, Last_name: input.last_name, cust_email: input.email, phone: input.phone, phone_extension: input.phone_extension, company: input.company, non_sale: input.non_sale, admin_id: input.admin_id, admin: salesperson?.name ?? "", salesperson: salesperson?.name ?? "", shipping: { address1: input.address1, address2: input.address2, city: input.city, state: input.state, zip: input.zip }, shipping_address: [input.address1, input.address2, input.city, input.state, input.zip].join("#php#") };
      return json({ data: updated, meta: {}, message: "Order updated successfully." });
    }
  }
  return json({ data: null, meta: {}, message: "The requested new-order operation was not found." }, 404);
}

function fixtureBrochureList(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "all";
  const status = url.searchParams.get("status") ?? "active";
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("per_page") ?? 25)));
  const search = (url.searchParams.get("search") ?? "").toLowerCase();
  const filtered = brochureFixtures.filter((item) => {
    const active = status === "all" || item.is_active === (status === "active");
    const queue = type === "new" ? !item.letter_date : type === "today" ? toFixtureIso(item.followup_date) === (url.searchParams.get("followup_date") ?? "2026-09-01") : true;
    const keyword = !search || `${item.id} ${item.full_name} ${item.email} ${item.phone ?? ""}`.toLowerCase().includes(search);
    const fields = [
      ["First_Name", item.first_name], ["Last_Name", item.last_name], ["Phone", item.phone], ["Email", item.email],
    ].every(([key, value]) => !url.searchParams.get(key as string) || String(value ?? "").toLowerCase().includes(String(url.searchParams.get(key as string)).toLowerCase()));
    const admin = !url.searchParams.get("admin_id") || item.admin_id === Number(url.searchParams.get("admin_id"));
    const followup = !url.searchParams.get("followup_date") || toFixtureIso(item.followup_date) === url.searchParams.get("followup_date");
    const letter = !url.searchParams.get("letter_date") || toFixtureIso(item.letter_date) === url.searchParams.get("letter_date");
    return active && queue && keyword && fields && admin && followup && letter;
  });
  const lastPage = Math.max(1, Math.ceil(filtered.length / perPage));
  return json({ data: { items: filtered.slice((page - 1) * perPage, page * perPage) }, meta: { pagination: { current_page: page, per_page: perPage, total: filtered.length, last_page: lastPage } }, message: "Brochures retrieved." });
}

function toFixtureIso(value: string | null) {
  if (!value) return "";
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}` : value;
}

function fixtureBrochureFromInput(input: BrochureInput, id: number, current = brochureFixtures[0]) {
  const admin = brochureOptionsFixture.admins.find((option) => option.id === input.admin_id);
  return { ...current, id, first_name: input.First_Name, last_name: input.Last_Name, full_name: `${input.First_Name} ${input.Last_Name}`.trim(), address: input.Address ?? "", city: input.City ?? "", state: input.State ?? "", zip: input.Zip ?? "", email: input.Email, phone: input.Phone ?? "", phone_extension: input.phone_extension ?? null, notes: input.Notes ?? current.notes, memo: input.memo ?? "", ad: input.Ad ?? "", ad_other: input.ad_other ?? "", classification: input.Classification ?? "", do_not_mail: Boolean(input.do_not_mail), orig_date: input.Orig_Date ?? current.orig_date, followup_date: input.Followup_date ?? "", letter_date: input.letter_date ?? "", admin_id: input.admin_id ?? 1, admin: admin?.name ?? "Alex Morgan", language: input.language ?? "en", is_active: true };
}

function fixtureBrochureCsv() {
  const rows = brochureFixtures.map((item) => [item.first_name, item.last_name, item.address, item.city, item.state, item.zip]);
  const csv = [["First_Name", "Last_Name", "Address", "City", "State", "Zip"], ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
  return new Response(csv, { status: 200, headers: { ...NO_STORE_HEADERS, "content-type": "text/csv; charset=UTF-8", "content-disposition": 'attachment; filename="brochures.csv"' } });
}

async function handleFixtureBrochures(request: Request, path: string) {
  if (path === "/brochures/export" && request.method === "GET") return fixtureBrochureCsv();
  if (path === "/brochures/create" && request.method === "GET") return json({ data: brochureOptionsFixture, meta: {}, message: "Brochure options retrieved." });
  if ((path === "/brochures" || path === "/brochures/ajax_users") && request.method === "GET") return fixtureBrochureList(request);
  if (path === "/brochures" && request.method === "POST") return json({ data: fixtureBrochureFromInput(await request.json() as BrochureInput, 8813), meta: {}, message: "Brochure created." }, 201);
  if (path === "/brochures/move_selected_callbacks" && request.method === "POST") { const input = await request.json() as { selected?: number[] }; return json({ data: { updated: input.selected?.length ?? 0 }, meta: {}, message: "Selected brochure callbacks moved." }); }
  const statusMatch = path.match(/^\/brochures\/(\d+)\/status$/);
  if (statusMatch && request.method === "PUT") { const record = brochureFixtures.find((item) => item.id === Number(statusMatch[1])); return record ? json({ data: { ...record, is_active: !record.is_active }, meta: {}, message: "Brochure status updated." }) : json({ data: null, meta: {}, message: "Brochure not found." }, 404); }
  const editMatch = path.match(/^\/brochures\/(\d+)\/edit$/);
  if (editMatch && request.method === "GET") { const record = brochureFixtures.find((item) => item.id === Number(editMatch[1])); return record ? json({ data: { brochure: record, options: brochureOptionsFixture }, meta: {}, message: "Brochure edit options retrieved." }) : json({ data: null, meta: {}, message: "Brochure not found." }, 404); }
  const sendMatch = path.match(/^\/brochures\/(\d+)\/send_email$/);
  if (sendMatch && request.method === "POST") return json({ data: { history_id: 401, brochure_id: Number(sendMatch[1]) }, meta: {}, message: "Brochure email sent." });
  const recordMatch = path.match(/^\/brochures\/(\d+)$/);
  if (recordMatch) { const record = brochureFixtures.find((item) => item.id === Number(recordMatch[1])); if (!record) return json({ data: null, meta: {}, message: "Brochure not found." }, 404); if (request.method === "GET") return json({ data: record, meta: {}, message: "Brochure retrieved." }); if (request.method === "PATCH" || request.method === "PUT") return json({ data: fixtureBrochureFromInput(await request.json() as BrochureInput, record.id, record), meta: {}, message: "Brochure updated." }); }

  if (path === "/brochure_email_templates" && request.method === "GET") return json({ data: { items: brochureTemplateFixtures }, meta: { pagination: { current_page: 1, per_page: 25, total: brochureTemplateFixtures.length, last_page: 1 } }, message: "Brochure email templates retrieved." });
  if (path === "/brochure_email_templates" && request.method === "POST") { const input = await request.json() as BrochureTemplateInput; return json({ data: { id: 53, admin_id: 1, ...input, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, meta: {}, message: "Brochure email template created." }, 201); }
  const templateMatch = path.match(/^\/brochure_email_templates\/(\d+)$/);
  if (templateMatch) { const template = brochureTemplateFixtures.find((item) => item.id === Number(templateMatch[1])); if (!template) return json({ data: null, meta: {}, message: "Brochure email template not found." }, 404); if (request.method === "DELETE") return json({ data: null, meta: {}, message: "Brochure email template deleted." }); if (request.method === "PATCH" || request.method === "PUT") return json({ data: { ...template, ...(await request.json() as BrochureTemplateInput) }, meta: {}, message: "Brochure email template updated." }); }
  const resolvedMatch = path.match(/^\/brochure_email_template\/(\d+)\/(\d+)$/);
  if (resolvedMatch && request.method === "GET") { const template = brochureTemplateFixtures.find((item) => item.id === Number(resolvedMatch[1])); const brochure = brochureFixtures.find((item) => item.id === Number(resolvedMatch[2])); if (!template || !brochure) return json({ data: null, meta: {}, message: "Template not found." }, 404); const replace = (value: string) => value.replaceAll("{firstname}", brochure.first_name).replaceAll("{lastname}", brochure.last_name).replaceAll("{classification}", brochure.classification ?? ""); return json({ data: { ...template, subject: replace(template.subject), content: replace(template.content) }, meta: {}, message: "Brochure email template retrieved." }); }
  const testMatch = path.match(/^\/brochure_email_template\/(\d+)\/test_email$/);
  if (testMatch && request.method === "POST") { const input = await request.json() as { email: string }; return json({ data: { email: input.email, template_id: Number(testMatch[1]) }, meta: {}, message: "Test email sent." }); }
  const historyMatch = path.match(/^\/brochure\/email_history\/(\d+)$/);
  if (historyMatch && request.method === "GET") return json({ data: { items: [{ id: 401, brochure_id: Number(historyMatch[1]), admin_id: 1, email_content: { subject: "Your brochure information", content: "Thanks for requesting a brochure.", to_email: "riley.garcia@example.test" }, admin: { id: 1, name: "Alex", last_name: "Morgan" }, created_at: "2026-09-01T17:30:00Z" }] }, meta: {}, message: "Brochure email history retrieved." });
  return json({ data: null, meta: {}, message: "The requested brochure operation was not found." }, 404);
}

const fixtureApplication = {
  id: 4201,
  customer_id: 48219,
  customer_name: "Jamie Rivera",
  customer_email: "jamie.rivera@example.test",
  customer_phone: "(916) 555-0142",
  application_number: "APP-4242",
  source_student_id: "STUDENT-48219",
  app_fee_number: "AF-7777",
  packet_type: "original",
  status: "under_review",
  stage: "staff_review",
  law_exam_scheduled_at: "2026-09-21T16:00:00Z",
  trade_exam_scheduled_at: "2026-09-23T16:00:00Z",
  license_number: "",
  source_updated_at: "2026-09-01T17:00:00Z",
  synced_at: "2026-09-01T17:05:00Z",
};

function fixtureGlobalSearch(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (query.length < 2 || query.length > 100) return error(422, "VALIDATION_ERROR", "Enter between 2 and 100 characters to search.");
  const term = query.toLowerCase();
  const matches = (value: string) => value.toLowerCase().includes(term);
  const students = studentFixtures.filter((student) => matches(`${student.customerid} ${student.name} ${student.lname ?? ""} ${student.email} ${student.mobilenum ?? ""}`)).slice(0, 6).map((student) => ({ key: `student-${student.customerid}`, type: "student", record_id: String(student.customerid), title: `${student.name} ${student.lname ?? ""}`.trim(), subtitle: `${student.email} · ${student.mobilenum ?? ""}`, identifier: `Customer #${student.customerid}`, href: `/staff/students/${student.customerid}` }));
  const orders = newOrderFixtures.filter((order) => matches(`${order.id} ${order.First_name} ${order.Last_name} ${order.cust_email} ${order.phone ?? ""}`)).slice(0, 6).map((order) => ({ key: `order-${order.id}`, type: "order", record_id: String(order.id), title: `Order #${order.id}`, subtitle: `${order.First_name} ${order.Last_name}`, identifier: `${order.sku ?? ""} · ${order.order_date ?? ""}`, href: `/staff/orders/${order.id}` }));
  const brochures = brochureFixtures.filter((brochure) => matches(`${brochure.id} ${brochure.full_name} ${brochure.email} ${brochure.phone ?? ""}`)).slice(0, 6).map((brochure) => ({ key: `brochure-${brochure.id}`, type: "brochure", record_id: String(brochure.id), title: brochure.full_name, subtitle: `${brochure.email} · ${brochure.phone ?? ""}`, identifier: `Brochure #${brochure.id}`, href: `/staff/brochures/${brochure.id}` }));
  const applications = matches(`${fixtureApplication.application_number} ${fixtureApplication.app_fee_number} ${fixtureApplication.customer_id} ${fixtureApplication.customer_name} ${fixtureApplication.customer_email} ${fixtureApplication.customer_phone}`) ? [{ key: `application-${fixtureApplication.id}`, type: "application", record_id: String(fixtureApplication.id), title: `Application ${fixtureApplication.application_number}`, subtitle: fixtureApplication.customer_name, identifier: "Under review · Staff review", href: `/staff/applications/${fixtureApplication.id}` }] : [];
  const groups = { students, orders, brochures, applications };
  return json({ data: { query, groups, total: Object.values(groups).reduce((total, items) => total + items.length, 0) }, meta: {}, message: "Staff search completed successfully." });
}

function fixtureOrderRecord(id: number) {
  const order = newOrderFixtures.find((entry) => entry.id === id);
  if (!order) return json({ data: null, meta: {}, message: "Order not found." }, 404);
  return json({ data: { id: order.id, order_number: String(order.id), customer_name: `${order.First_name} ${order.Last_name}`, email: order.cust_email, phone: order.phone ?? "", company: order.company ?? "", sku: order.sku ?? "", classification: order.classification ?? "", salesperson: order.salesperson ?? "", order_date: order.order_date ?? "", ship_date: order.ship_date ?? "", tracking_number: "", shipping_type: order.shipping_type ?? "", subtotal: order.subtotal, shipping_price: order.shipping_price, sales_tax: order.sales_tax, grand_total: order.grand_total, item_description: order.item_description ?? "", instructions: order.orderinstructions ?? "", shipped: Boolean(order.shipped) }, meta: {}, message: "Order retrieved successfully." });
}

const fixtureEnrollmentQuotes = new Map<string, {
  customerId: number;
  sku: string;
  classification: string;
  productName: string;
  shippingMethod: string;
  subtotal: string;
  tax: string;
  shipping: string;
  total: string;
}>();
const fixtureEnrollmentOrders = new Map<string, Record<string, unknown>>();

function fixtureEnrollmentOptions(customerId: number) {
  const customer = studentFixtures.find((student) => student.customerid === customerId);
  if (!customer) return error(404, "CUSTOMER_NOT_FOUND", "Customer not found.");
  return json({ data: {
    customer: { id: customer.customerid, first_name: customer.name, last_name: customer.lname ?? "", email: customer.email, phone: customer.mobilenum ?? "", company: "", address: { line1: customer.address ?? "", line2: "", city: customer.city ?? "", state: customer.state ?? "", zip: customer.zip ?? "" } },
    products: [
      { sku: "KIT-B", name: "B General Building study package", price: "500.00", requires_shipping: true, popular: true },
      { sku: "ONLINE-LAW", name: "Law online course", price: "295.00", requires_shipping: false, popular: false },
    ],
    classifications: [{ id: 44, code: "B", name: "General Building Contractor" }, { id: 59, code: "C-10", name: "Electrical Contractor" }],
    shipping_methods: [{ id: "none", label: "No shipping", price: "0.00" }, { id: "ground", label: "UPS Ground", price: "16.85" }, { id: "two_day", label: "UPS Two Day", price: "38.50" }, { id: "next_day", label: "UPS Next Day", price: "54.50" }],
    payment_methods: [{ id: "card", label: "Credit card", enabled: fixtureCheckout.staff_checkout.card }, { id: "check", label: "Check", enabled: fixtureCheckout.staff_checkout.check }, { id: "cash", label: "Cash", enabled: fixtureCheckout.staff_checkout.cash }],
    card_tokenization: { enabled: false, login_id: null, client_key: null, script_url: null },
    maximum_discount_percent: 100,
  }, meta: {}, message: "Staff enrollment options retrieved successfully." });
}

async function handleFixtureEnrollment(request: Request, path: string) {
  if (path === "/enrollments/options" && request.method === "GET") return fixtureEnrollmentOptions(Number(new URL(request.url).searchParams.get("customer_id")));
  if (path === "/enrollments/quote" && request.method === "POST") {
    const input = await request.json() as { customer_id: number; sku: string; classification_id: number; shipping_method: string; discount?: { type?: string; value?: number; reason?: string } };
    const product = input.sku === "ONLINE-LAW" ? { price: 295, shipping: false, name: "Law online course" } : input.sku === "KIT-B" ? { price: 500, shipping: true, name: "B General Building study package" } : null;
    if (!product) return error(422, "SKU_UNAVAILABLE", "The selected SKU is unavailable for staff ordering.");
    if (product.shipping && input.shipping_method === "none") return error(422, "SHIPPING_REQUIRED", "Select a shipping method for this product.");
    const type = input.discount?.type ?? "none";
    if (type !== "none" && (input.discount?.reason?.trim().length ?? 0) < 5) return error(422, "DISCOUNT_REASON_REQUIRED", "Enter a reason for the discount.");
    const discount = type === "percent" ? product.price * Math.min(100, Number(input.discount?.value ?? 0)) / 100 : type === "fixed" ? Math.min(product.price, Number(input.discount?.value ?? 0)) : 0;
    const subtotal = product.price - discount;
    const tax = product.shipping ? 40 * (subtotal / product.price) : 0;
    const shippingPrices: Record<string, number> = { none: 0, ground: 16.85, two_day: 38.5, next_day: 54.5 };
    const shipping = product.shipping ? shippingPrices[input.shipping_method] ?? 0 : 0;
    const total = subtotal + tax + shipping;
    const id = crypto.randomUUID();
    const classification = input.classification_id === 59 ? "C-10" : "B";
    fixtureEnrollmentQuotes.set(id, { customerId: input.customer_id, sku: input.sku, classification, productName: product.name, shippingMethod: product.shipping ? input.shipping_method : "none", subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), shipping: shipping.toFixed(2), total: total.toFixed(2) });
    return json({ data: { id, sku: input.sku, product_name: product.name, classification_id: input.classification_id, classification, shipping_method: product.shipping ? input.shipping_method : "none", requires_shipping: product.shipping, items: [{ description: product.name, price_cents: product.price * 100, price: product.price.toFixed(2) }], amounts: { list_subtotal: product.price.toFixed(2), discount: discount.toFixed(2), subtotal: subtotal.toFixed(2), tax: tax.toFixed(2), shipping: shipping.toFixed(2), total: total.toFixed(2), total_cents: Math.round(total * 100) }, discount: { type, reason: input.discount?.reason ?? null }, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }, meta: {}, message: "Staff enrollment quote created successfully." }, 201);
  }
  if (path === "/enrollments/orders" && request.method === "POST") {
    const input = await request.json() as { quote_id: string; idempotency_key: string; payment?: { method?: string }; billing?: { company?: string }; shipping?: { line1?: string; line2?: string; city?: string; state?: string; zip?: string }; order_instructions?: string };
    const replay = fixtureEnrollmentOrders.get(input.idempotency_key);
    if (replay) return json({ data: { ...replay, idempotent_replay: true }, meta: {}, message: "Enrollment order created successfully." }, 201);
    const quote = fixtureEnrollmentQuotes.get(input.quote_id);
    if (!quote) return error(409, "QUOTE_EXPIRED", "This quote has expired. Recalculate the order before submitting payment.");
    if (input.payment?.method === "card") return error(503, "PAYMENT_UNAVAILABLE", "Card processing is not configured in fixture mode.");
    fixtureEnrollmentQuotes.delete(input.quote_id);
    const customer = studentFixtures.find((student) => student.customerid === quote.customerId)!;
    if (!newOrderFixtures.some((order) => order.id === 64099)) newOrderFixtures.unshift({ id: 64099, First_name: customer.name, Last_name: customer.lname ?? "", order_date: "09/02/2026", cust_email: customer.email, phone: customer.mobilenum ?? "", phone_extension: null, grand_total: Number(quote.total), admin: "Alex Morgan", admin_id: 1, salesperson: "Alex Morgan", non_sale: false, shipped: false, ship_date: null, company: input.billing?.company ?? "", shipping_address: [input.shipping?.line1, input.shipping?.line2, input.shipping?.city, input.shipping?.state, input.shipping?.zip].join("#php#"), billing_address: null, sku: quote.sku, classification: quote.classification, item_description: quote.productName, subtotal: Number(quote.subtotal), sales_tax: Number(quote.tax), shipping_type: quote.shippingMethod === "ground" ? "UPS Ground" : quote.shippingMethod === "two_day" ? "UPS Two Day" : quote.shippingMethod === "next_day" ? "UPS Next Day" : "No shipping", shipping_price: Number(quote.shipping), orderinstructions: input.order_instructions ?? null, shipping: { address1: input.shipping?.line1 ?? "", address2: input.shipping?.line2 ?? "", city: input.shipping?.city ?? "", state: input.shipping?.state ?? "", zip: input.shipping?.zip ?? "" }, items: [{ description: quote.productName, price: Number(quote.subtotal) }] });
    const result = { order_id: 64099, customer_id: quote.customerId, quote_id: input.quote_id, sku: quote.sku, classification: quote.classification, total: quote.total, payment: { method: input.payment?.method ?? "check", transaction_id: null, account_type: input.payment?.method ?? "check", account_last_four: null }, idempotent_replay: false };
    fixtureEnrollmentOrders.set(input.idempotency_key, result);
    return json({ data: result, meta: {}, message: "Enrollment order created successfully." }, 201);
  }
  return error(404, "VALIDATION_ERROR", "The requested enrollment operation was not found.");
}

async function handleFixtureSettings(request: Request, path: string, persona: NonNullable<ReturnType<typeof readFixturePersona>>) {
  const principal = createFixturePrincipal(persona);
  const isManager = principal.capabilities.includes("settings.manage");
  if (path === "/profile") {
    const names = principal.name.split(" ");
    const current = fixtureProfiles.get(persona) ?? { id: principal.id, username: principal.username, name: names[0] ?? principal.name, last_name: names.slice(1).join(" "), email: principal.email, mail_form_name: principal.name, signature: "Thank you,\n" + principal.name };
    if (request.method === "GET") return json({ data: current, meta: {}, message: "Staff profile retrieved." });
    if (request.method === "PATCH") {
      const input = await request.json() as Partial<typeof current>;
      const updated = { ...current, ...input, id: current.id, username: current.username };
      fixtureProfiles.set(persona, updated);
      return json({ data: updated, meta: {}, message: "Profile settings updated." });
    }
  }
  if (path === "/profile/password" && request.method === "PUT") {
    const input = await request.json() as { current_password?: string; new_password?: string; new_password_confirmation?: string };
    if (input.current_password !== "staff-demo") return error(422, "VALIDATION_ERROR", "The current password is incorrect.");
    if (!input.new_password || input.new_password.length < 12 || input.new_password !== input.new_password_confirmation) return error(422, "VALIDATION_ERROR", "Use at least 12 characters and confirm the new password.");
    return json({ data: { other_sessions_revoked: 1 }, meta: {}, message: "Password updated securely." });
  }

  if (!isManager) return error(403, "FORBIDDEN", "You are not authorized to manage system settings.");
  const list = <T>(items: T[], message: string, extra: Record<string, unknown> = {}) => json({ data: { items, ...extra }, meta: { pagination: { current_page: 1, per_page: 100, total: items.length, last_page: 1 } }, message });
  const body = async () => await request.json() as Record<string, unknown>;

  if (path === "/office_location" && request.method === "GET") return list(fixtureOffices, "Office locations retrieved.");
  if (path === "/office_location" && request.method === "POST") { const input = await body(); const item = { ...input, id: Date.now() } as typeof fixtureOffices[number]; fixtureOffices = [...fixtureOffices, item]; return json({ data: item, meta: {}, message: "Office location created." }, 201); }
  const officeMatch = path.match(/^\/office_location\/(\d+)$/);
  if (officeMatch && request.method === "PATCH") { const id = Number(officeMatch[1]); const input = await body(); fixtureOffices = fixtureOffices.map((item) => item.id === id ? { ...item, ...input } as typeof item : item); return json({ data: fixtureOffices.find((item) => item.id === id), meta: {}, message: "Office location updated." }); }
  if (officeMatch && request.method === "DELETE") { fixtureOffices = fixtureOffices.filter((item) => item.id !== Number(officeMatch[1])); return json({ data: null, meta: {}, message: "Office location deleted." }); }

  if (path === "/settings/class-locations" && request.method === "GET") return list(fixtureClassLocations, "Class locations retrieved.");
  if (path === "/settings/class-locations" && request.method === "POST") { const input = await body(); const item = { id: Date.now(), name: String(input.Cities), room: String(input.Room), address: String(input.Address ?? ""), city: String(input.City ?? ""), state: String(input.State ?? ""), zip: String(input.Zip ?? ""), trade_time: String(input.Trade_Time ?? ""), law_time: String(input.Law_Time ?? ""), max_size: Number(input.max_size ?? 1), spanish: Boolean(input.es) }; fixtureClassLocations = [...fixtureClassLocations, item]; return json({ data: item, meta: {}, message: "Class location created." }, 201); }
  const classMatch = path.match(/^\/settings\/class-locations\/(\d+)$/);
  if (classMatch && request.method === "PATCH") { const id = Number(classMatch[1]); const input = await body(); fixtureClassLocations = fixtureClassLocations.map((item) => item.id === id ? { ...item, name: String(input.Cities ?? item.name), room: String(input.Room ?? item.room), address: String(input.Address ?? item.address), city: String(input.City ?? item.city), state: String(input.State ?? item.state), zip: String(input.Zip ?? item.zip), trade_time: String(input.Trade_Time ?? item.trade_time), law_time: String(input.Law_Time ?? item.law_time), max_size: Number(input.max_size ?? item.max_size), spanish: input.es === undefined ? item.spanish : Boolean(input.es) } : item); return json({ data: fixtureClassLocations.find((item) => item.id === id), meta: {}, message: "Class location updated." }); }
  if (classMatch && request.method === "DELETE") { fixtureClassLocations = fixtureClassLocations.filter((item) => item.id !== Number(classMatch[1])); return json({ data: null, meta: {}, message: "Class location deleted." }); }

  if (path === "/manage_valid_ips" && request.method === "GET") return list(fixtureValidIps, "Valid IPs retrieved.");
  if (path === "/manage_valid_ips" && request.method === "POST") { const input = await body(); const item = { id: Date.now(), ip: String(input.ip) }; fixtureValidIps = [...fixtureValidIps, item]; return json({ data: item, meta: {}, message: "Valid IP created." }, 201); }
  const ipMatch = path.match(/^\/manage_valid_ips\/(\d+)$/);
  if (ipMatch && request.method === "DELETE") { const id = Number(ipMatch[1]); if (fixtureValidIps.find((item) => item.id === id)?.ip === "127.0.0.1") return error(409, "CURRENT_IP_LOCKOUT", "The current session IP cannot be removed."); fixtureValidIps = fixtureValidIps.filter((item) => item.id !== id); return json({ data: null, meta: {}, message: "Valid IP deleted." }); }

  if (path === "/settings/firewall" && request.method === "GET") return list(fixtureFirewall, "Firewall entries retrieved.", { current_ip: "127.0.0.1" });
  if (path === "/settings/firewall" && request.method === "POST") { const input = await body(); if (input.ip_address === "127.0.0.1" && !input.whitelisted) return error(409, "CURRENT_IP_LOCKOUT", "This change would block the current session IP."); const item = { id: Date.now(), ip_address: String(input.ip_address), whitelisted: Boolean(input.whitelisted), mode: (input.whitelisted ? "allow" : "block") as "allow" | "block", created_at: new Date().toISOString() }; fixtureFirewall = [...fixtureFirewall, item]; return json({ data: item, meta: {}, message: "Firewall entry created." }, 201); }
  const firewallMatch = path.match(/^\/settings\/firewall\/(\d+)$/);
  if (firewallMatch && request.method === "PATCH") { const id = Number(firewallMatch[1]); const input = await body(); fixtureFirewall = fixtureFirewall.map((item) => item.id === id ? { ...item, whitelisted: Boolean(input.whitelisted), mode: input.whitelisted ? "allow" : "block" } : item); return json({ data: fixtureFirewall.find((item) => item.id === id), meta: {}, message: "Firewall entry updated." }); }
  if (firewallMatch && request.method === "DELETE") { fixtureFirewall = fixtureFirewall.filter((item) => item.id !== Number(firewallMatch[1])); return json({ data: null, meta: {}, message: "Firewall entry deleted." }); }

  if (path === "/settings/checkout-payment-methods" && request.method === "GET") return json({ data: fixtureCheckout, meta: {}, message: "Checkout payment visibility retrieved." });
  if (path === "/settings/checkout-payment-methods" && request.method === "PUT") { const input = await body(); if (!input.staff_card && !input.staff_check && !input.staff_cash) return error(422, "VALIDATION_ERROR", "At least one Staff Hub payment method must remain visible."); fixtureCheckout = { customer_checkout: { google_pay: Boolean(input.google_pay), apple_pay: Boolean(input.apple_pay), paypal: Boolean(input.paypal) }, staff_checkout: { card: Boolean(input.staff_card), check: Boolean(input.staff_check), cash: Boolean(input.staff_cash) } }; return json({ data: fixtureCheckout, meta: {}, message: "Checkout payment visibility updated." }); }

  if (path === "/settings/skus" && request.method === "GET") return list(fixtureSkus, "SKU settings retrieved.");
  if (path === "/settings/skus" && request.method === "POST") { const input = await body(); const item = { ...input, id: Date.now(), sku: String(input.sku).toUpperCase(), subtotal: Number(input.subtotal).toFixed(2), sales_tax: Number(input.sales_tax ?? 0).toFixed(2) } as typeof fixtureSkus[number]; fixtureSkus = [...fixtureSkus, item]; return json({ data: item, meta: {}, message: "SKU created." }, 201); }
  const skuMatch = path.match(/^\/settings\/skus\/(\d+)$/);
  if (skuMatch && request.method === "PATCH") { const id = Number(skuMatch[1]); const input = await body(); fixtureSkus = fixtureSkus.map((item) => item.id === id ? { ...item, ...input } as typeof item : item); return json({ data: fixtureSkus.find((item) => item.id === id), meta: {}, message: "SKU updated." }); }

  if (path === "/settings/enrollment-agreements" && request.method === "GET") return json({ data: { items: fixtureAgreements, first_time_options: fixtureFirstTimes }, meta: { pagination: { current_page: 1, per_page: 100, total: fixtureAgreements.length, last_page: 1 } }, message: "Enrollment agreements retrieved." });
  if (path === "/settings/enrollment-agreements" && request.method === "POST") { const input = await body(); if (input.active) fixtureAgreements = fixtureAgreements.map((item) => item.first_time === input.first_time ? { ...item, active: false } : item); const item = { id: Date.now(), first_time: String(input.first_time), revision_date: String(input.revision_date), body: String(input.body), active: Boolean(input.active) }; fixtureAgreements = [item, ...fixtureAgreements]; return json({ data: item, meta: {}, message: "Enrollment agreement created." }, 201); }
  const agreementMatch = path.match(/^\/settings\/enrollment-agreements\/(\d+)$/);
  if (agreementMatch && request.method === "PATCH") { const id = Number(agreementMatch[1]); const input = await body(); if (input.active) fixtureAgreements = fixtureAgreements.map((item) => item.first_time === input.first_time ? { ...item, active: false } : item); fixtureAgreements = fixtureAgreements.map((item) => item.id === id ? { ...item, ...input } as typeof item : item); return json({ data: fixtureAgreements.find((item) => item.id === id), meta: {}, message: "Enrollment agreement updated." }); }

  return error(404, "VALIDATION_ERROR", "The requested settings operation was not found.");
}

async function handleFixture(request: Request, path: string): Promise<Response> {
  if (path === "/auth/login" && request.method === "POST") {
    let body: { username?: unknown; password?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return error(422, "VALIDATION_ERROR", "Enter both your username and password to continue.");
    }
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!username || !password) return error(422, "VALIDATION_ERROR", "Enter both your username and password to continue.");
    const fixtureError = fixtureLoginError(username);
    if (fixtureError) return error(fixtureError.status, fixtureError.code, fixtureError.message);
    if (username === "offsite") return json({ status: "otp_required", challenge: fixtureChallenge() });
    const persona = username === "approved" ? "superadmin" : username;
    if (!isPersonaKey(persona)) return error(401, "INVALID_CREDENTIALS", "We couldn’t verify those sign-in details. Check them and try again.");
    return json({ status: "authenticated", principal: createFixturePrincipal(persona) }, 200, { "set-cookie": fixtureCookie(persona, request) });
  }

  if (path.endsWith("/verify") && request.method === "POST") {
    let body: { code?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return error(422, "VALIDATION_ERROR", "Enter the seven-digit code from your email.");
    }
    if (body.code !== "2468101") return error(422, "INVALID_OTP", "That code wasn’t accepted. Try again.", 2);
    return json({ status: "authenticated", principal: createFixturePrincipal("staff-standard") }, 200, { "set-cookie": fixtureCookie("staff-standard", request) });
  }

  if (path.endsWith("/resend") && request.method === "POST") return json({ challenge: fixtureChallenge() });

  if (path === "/me" && request.method === "GET") {
    const persona = readFixturePersona(request);
    if (!persona) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return json(createFixturePrincipal(persona));
  }

  if (path === "/logout" && request.method === "POST") {
    return new Response(null, { status: 204, headers: { ...NO_STORE_HEADERS, "set-cookie": clearCookie("cis_staff_fixture", request) } });
  }

  if (path === "/profile" || path === "/profile/password" || path.startsWith("/settings/") || path === "/office_location" || path.startsWith("/office_location/") || path === "/manage_valid_ips" || path.startsWith("/manage_valid_ips/")) {
    const persona = readFixturePersona(request);
    if (!persona) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return handleFixtureSettings(request, path, persona);
  }

  if (path === "/search" && request.method === "GET") {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return fixtureGlobalSearch(request);
  }

  const fixtureOrderMatch = path.match(/^\/orders\/(\d+)$/);
  if (fixtureOrderMatch && request.method === "GET") {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return fixtureOrderRecord(Number(fixtureOrderMatch[1]));
  }

  const fixtureApplicationMatch = path.match(/^\/applications\/(\d+)$/);
  if (fixtureApplicationMatch && request.method === "GET") {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return Number(fixtureApplicationMatch[1]) === fixtureApplication.id
      ? json({ data: fixtureApplication, meta: {}, message: "Application retrieved successfully." })
      : json({ data: null, meta: {}, message: "Application not found." }, 404);
  }

  if (path.startsWith("/enrollments")) {
    const persona = readFixturePersona(request);
    if (!persona) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    if (!createFixturePrincipal(persona).capabilities.includes("orders.create")) return error(403, "VALIDATION_ERROR", "You are not authorized to create customer orders.");
    return handleFixtureEnrollment(request, path);
  }

  if (path.startsWith("/students")) {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return handleFixtureStudents(request, path);
  }

  if (path.startsWith("/customer-devices")) {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return handleFixtureCustomerDevices(request, path);
  }

  if (path.startsWith("/new_order")) {
    const persona = readFixturePersona(request);
    if (!persona) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    if (!createFixturePrincipal(persona).capabilities.includes("new-orders.view")) return error(403, "FORBIDDEN", "You are not authorized to access the new-order queue.");
    return handleFixtureNewOrders(request, path);
  }

  if (path.startsWith("/brochures") || path.startsWith("/brochure_email") || path.startsWith("/brochure/email_history")) {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return handleFixtureBrochures(request, path);
  }

  return error(404, "VALIDATION_ERROR", "The requested staff operation was not found.");
}

function upstreamOrigin() {
  const configured = process.env.STAFF_API_ORIGIN?.trim();
  if (!configured) return null;
  try {
    const base = new URL(configured);
    const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (base.protocol !== "https:" && !localHostnames.has(base.hostname)) return null;
    return base;
  } catch {
    return null;
  }
}

function capabilityList(staff: Record<string, unknown>) {
  const permissions = (staff.permissions ?? {}) as Record<string, unknown>;
  const type = typeof staff.type === "string" ? staff.type : "staff";
  const capabilities = new Set(["staff.access", "dashboard.view", "students.view", "customer-devices.view", "orders.view", "messages.view", "brochures.manage"]);
  if (permissions.shipping_access) capabilities.add("shipping.access");
  if (permissions.instructor) capabilities.add("instruction.access");
  if (permissions.online_courses) capabilities.add("content.manage");
  if (permissions.translator) capabilities.add("content.translate");
  if (type === "superadmin") {
    capabilities.add("students.create");
    capabilities.add("reports.view");
    capabilities.add("settings.manage");
    capabilities.add("admin-users.manage");
    capabilities.add("customer-devices.delete");
    capabilities.add("orders.create");
  }
  if (permissions.live_pending_orders) capabilities.add("orders.create");
  if (type === "superadmin" || permissions.shipping_access || (!permissions.translator && !permissions.instructor && !permissions.insurance_agent)) capabilities.add("new-orders.view");
  return [...capabilities];
}

export function principalFromUpstream(value: unknown): StaffPrincipal | null {
  if (!value || typeof value !== "object") return null;
  const staff = value as Record<string, unknown>;
  if (typeof staff.id !== "number" || typeof staff.username !== "string" || typeof staff.email !== "string") return null;
  const fullName = typeof staff.full_name === "string" && staff.full_name.trim()
    ? staff.full_name
    : [staff.name, staff.last_name].filter((part) => typeof part === "string" && part).join(" ");
  return {
    id: staff.id,
    username: staff.username,
    name: fullName || staff.username,
    email: staff.email,
    staffType: typeof staff.type === "string" ? staff.type : null,
    capabilities: capabilityList(staff),
  };
}

function normalizedErrorCode(upstreamCode: unknown, status: number): StaffAuthErrorCode {
  const code = typeof upstreamCode === "string" ? upstreamCode : "";
  const mapping: Record<string, StaffAuthErrorCode> = {
    invalid_credentials: "INVALID_CREDENTIALS",
    staff_disabled: "ACCOUNT_INACTIVE",
    outside_office_disabled: "OFFSITE_DISABLED",
    otp_invalid: "INVALID_OTP",
    otp_attempts_exceeded: "RATE_LIMITED",
    otp_resend_cooldown: "RATE_LIMITED",
    staff_token_expired: "SESSION_EXPIRED",
    staff_token_inactive: "SESSION_EXPIRED",
    staff_token_required: "SESSION_EXPIRED",
    invalid_staff_token: "SESSION_EXPIRED",
    current_ip_lockout: "CURRENT_IP_LOCKOUT",
    settings_unavailable: "SETTINGS_UNAVAILABLE",
    payment_method_disabled: "PAYMENT_METHOD_DISABLED",
    PAYMENT_METHOD_DISABLED: "PAYMENT_METHOD_DISABLED",
  };
  return mapping[code] ?? (status === 422 ? "VALIDATION_ERROR" : status === 401 ? "SESSION_EXPIRED" : status === 403 ? "FORBIDDEN" : status === 429 ? "RATE_LIMITED" : "AUTH_UNAVAILABLE");
}

async function authRequestShape(request: Request, path: string) {
  const verify = path.match(/^\/auth\/challenges\/([^/]+)\/verify$/);
  const resend = path.match(/^\/auth\/challenges\/([^/]+)\/resend$/);
  if (!verify && !resend) return { path, body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body };
  let body: Record<string, unknown> = {};
  if (verify) {
    try { body = (await request.json()) as Record<string, unknown>; } catch { /* validation is handled upstream */ }
  }
  const challengeId = decodeURIComponent((verify ?? resend)![1]);
  return {
    path: verify ? "/auth/otp" : "/auth/otp/resend",
    body: JSON.stringify(verify ? { challenge_id: challengeId, otp: body.code } : { challenge_id: challengeId }),
  };
}

export async function handleStaffApiRequest(request: Request, path: string) {
  if (isFixtureAuthEnabled()) return handleFixture(request, path);

  const base = upstreamOrigin();
  if (!base || base.origin === new URL(request.url).origin) return error(503, "AUTH_UNAVAILABLE", "The sign-in service is temporarily unavailable. Please retry.");

  const shaped = await authRequestShape(request, path);
  const target = new URL(`/api/v2/staff${shaped.path}`, base);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const token = cookieValue(request, TOKEN_COOKIE);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const incomingUrl = new URL(request.url);
  headers.set("origin", incomingUrl.origin);
  headers.set("x-forwarded-host", request.headers.get("host") ?? incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
  const clientIp = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: shaped.body,
      redirect: "manual",
      cache: "no-store",
      duplex: "half",
    } as RequestInit & { duplex: "half" });
  } catch {
    return error(503, "AUTH_UNAVAILABLE", "The sign-in service is temporarily unavailable. Please retry.");
  }

  const isSettingsPath = path === "/profile" || path === "/profile/password" || path.startsWith("/settings/") || path === "/office_location" || path.startsWith("/office_location/") || path === "/manage_valid_ips" || path.startsWith("/manage_valid_ips/");
  if (!upstream.ok && isSettingsPath) {
    let payload: { meta?: Record<string, unknown>; message?: string } = {};
    try { payload = await upstream.json() as typeof payload; } catch { /* normalized below */ }
    return error(upstream.status, normalizedErrorCode(payload.meta?.error_code ?? payload.meta?.code, upstream.status), payload.message ?? "The settings service is temporarily unavailable. Please retry.");
  }

  const isAuthPath = path.startsWith("/auth/") || path === "/me" || path === "/logout";
  if (!isAuthPath) {
    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("cache-control", NO_STORE_HEADERS["cache-control"]);
    responseHeaders.set("pragma", NO_STORE_HEADERS.pragma);
    for (const name of ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "set-cookie"]) responseHeaders.delete(name);
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
  }

  let payload: { data?: Record<string, unknown>; meta?: Record<string, unknown>; message?: string } = {};
  try { payload = (await upstream.json()) as typeof payload; } catch { /* normalized below */ }

  if (!upstream.ok) {
    const upstreamCode = payload.meta?.error_code ?? payload.meta?.code;
    const attempts = typeof payload.meta?.attempts_remaining === "number" ? payload.meta.attempts_remaining : undefined;
    return error(upstream.status, normalizedErrorCode(upstreamCode, upstream.status), payload.message ?? "The sign-in service is temporarily unavailable. Please retry.", attempts);
  }

  if (path === "/logout") return new Response(null, { status: 204, headers: { ...NO_STORE_HEADERS, "set-cookie": clearCookie(TOKEN_COOKIE, request) } });

  if (path === "/me") {
    const principal = principalFromUpstream(payload.data);
    return principal ? json(principal) : error(503, "AUTH_UNAVAILABLE", "The sign-in service returned an invalid staff profile.");
  }

  if (path.endsWith("/resend")) {
    const data = payload.data ?? {};
    return json({ challenge: {
      id: String(data.challenge_id ?? ""),
      maskedDestination: String(data.masked_destination ?? "your staff email address"),
      expiresAt: String(data.expires_at ?? ""),
      resendAt: String(data.resend_available_at ?? ""),
      attemptsRemaining: Number(data.attempts_remaining ?? 3),
    } });
  }

  const data = payload.data ?? {};
  if (data.otp_required) {
    return json({ status: "otp_required", challenge: {
      id: String(data.challenge_id ?? ""),
      maskedDestination: String(data.masked_destination ?? "your staff email address"),
      expiresAt: String(data.expires_at ?? ""),
      resendAt: String(data.resend_available_at ?? ""),
      attemptsRemaining: Number(data.attempts_remaining ?? 3),
    } });
  }

  const principal = principalFromUpstream(data.staff);
  const accessToken = typeof data.access_token === "string" ? data.access_token : "";
  if (!principal || !accessToken) return error(503, "AUTH_UNAVAILABLE", "The sign-in service returned an invalid authentication response.");
  return json({ status: "authenticated", principal }, 200, { "set-cookie": tokenCookie(accessToken, typeof data.expires_at === "string" ? data.expires_at : null, request) });
}
