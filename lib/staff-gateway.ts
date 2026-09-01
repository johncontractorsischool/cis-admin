import {
  createFixturePrincipal,
  fixtureChallenge,
  fixtureLoginError,
  isFixtureAuthEnabled,
  isPersonaKey,
} from "./staff-fixtures";
import type { StaffApiErrorBody, StaffAuthErrorCode } from "./staff";

const NO_STORE_HEADERS = {
  "cache-control": "no-store, max-age=0",
  pragma: "no-cache",
};

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

function fixtureCookie(persona: string, request: Request) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `cis_staff_fixture=${encodeURIComponent(persona)}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function readFixturePersona(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("cis_staff_fixture="))
    ?.slice("cis_staff_fixture=".length);
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  return isPersonaKey(decoded) ? decoded : null;
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
    if (!username || !password) {
      return error(422, "VALIDATION_ERROR", "Enter both your username and password to continue.");
    }
    const fixtureError = fixtureLoginError(username);
    if (fixtureError) {
      return error(fixtureError.status, fixtureError.code, fixtureError.message);
    }
    if (username === "offsite") {
      return json({ status: "otp_required", challenge: fixtureChallenge() });
    }
    const persona = username === "approved" ? "superadmin" : username;
    if (!isPersonaKey(persona)) {
      return error(401, "INVALID_CREDENTIALS", "We couldn’t verify those sign-in details. Check them and try again.");
    }
    return json(
      { status: "authenticated", principal: createFixturePrincipal(persona) },
      200,
      { "set-cookie": fixtureCookie(persona, request) },
    );
  }

  if (path.endsWith("/verify") && request.method === "POST") {
    let body: { code?: unknown };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return error(422, "VALIDATION_ERROR", "Enter the seven-digit code from your email.");
    }
    if (body.code !== "2468101") {
      return error(422, "INVALID_OTP", "That code wasn’t accepted. Try again.", 2);
    }
    return json(
      { status: "authenticated", principal: createFixturePrincipal("staff-standard") },
      200,
      { "set-cookie": fixtureCookie("staff-standard", request) },
    );
  }

  if (path.endsWith("/resend") && request.method === "POST") {
    return json({ challenge: fixtureChallenge() });
  }

  if (path === "/me" && request.method === "GET") {
    const persona = readFixturePersona(request);
    if (!persona) return error(401, "SESSION_EXPIRED", "Your session has expired. Sign in again.");
    return json(createFixturePrincipal(persona));
  }

  if (path === "/logout" && request.method === "POST") {
    return new Response(null, {
      status: 204,
      headers: {
        ...NO_STORE_HEADERS,
        "set-cookie": "cis_staff_fixture=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
      },
    });
  }

  return error(404, "VALIDATION_ERROR", "The requested authentication operation was not found.");
}

function upstreamUrl(path: string): URL | null {
  const configured = process.env.STAFF_API_ORIGIN?.trim();
  if (!configured) return null;
  try {
    const base = new URL(configured);
    const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (base.protocol !== "https:" && !localHostnames.has(base.hostname)) return null;
    return new URL(`/api/v1/staff${path}`, base);
  } catch {
    return null;
  }
}

export async function handleStaffApiRequest(request: Request, path: string) {
  if (isFixtureAuthEnabled()) return handleFixture(request, path);

  const target = upstreamUrl(path);
  if (!target || target.origin === new URL(request.url).origin) {
    return error(503, "AUTH_UNAVAILABLE", "The sign-in service is temporarily unavailable. Please retry.");
  }

  const incomingUrl = new URL(request.url);
  target.search = incomingUrl.search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "user-agent"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("origin", incomingUrl.origin);
  headers.set("x-forwarded-host", request.headers.get("host") ?? incomingUrl.host);
  headers.set("x-forwarded-proto", incomingUrl.protocol.slice(0, -1));
  const clientIp =
    request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  if (clientIp) headers.set("x-forwarded-for", clientIp);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
      cache: "no-store",
      // Required by Node's streaming request implementation; ignored by workers.
      duplex: "half",
    } as RequestInit & { duplex: "half" });
  } catch {
    return error(503, "AUTH_UNAVAILABLE", "The sign-in service is temporarily unavailable. Please retry.");
  }

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("cache-control", NO_STORE_HEADERS["cache-control"]);
  responseHeaders.set("pragma", NO_STORE_HEADERS.pragma);
  for (const name of ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]) {
    responseHeaders.delete(name);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
