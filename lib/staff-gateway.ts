import {
  createFixturePrincipal,
  fixtureChallenge,
  fixtureLoginError,
  isFixtureAuthEnabled,
  isPersonaKey,
} from "./staff-fixtures";
import { fixtureStudent, studentFixtures } from "./student-fixtures";
import type { StaffApiErrorBody, StaffAuthErrorCode, StaffPrincipal } from "./staff";
import type { StudentInput } from "./students";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
};
const TOKEN_COOKIE = "cis_staff_token";

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

  if (path.startsWith("/students")) {
    if (!readFixturePersona(request)) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return handleFixtureStudents(request, path);
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
  const capabilities = new Set(["staff.access", "dashboard.view", "students.view", "orders.view", "messages.view", "brochures.manage"]);
  if (permissions.shipping_access) capabilities.add("shipping.access");
  if (permissions.instructor) capabilities.add("instruction.access");
  if (permissions.online_courses) capabilities.add("content.manage");
  if (permissions.translator) capabilities.add("content.translate");
  if (type === "superadmin") {
    capabilities.add("students.create");
    capabilities.add("reports.view");
    capabilities.add("settings.manage");
    capabilities.add("admin-users.manage");
  }
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
  };
  return mapping[code] ?? (status === 422 ? "VALIDATION_ERROR" : status === 401 ? "SESSION_EXPIRED" : status === 429 ? "RATE_LIMITED" : "AUTH_UNAVAILABLE");
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
