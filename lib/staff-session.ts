import { headers } from "next/headers";
import type { StaffPrincipal } from "./staff";
import { principalFromUpstream } from "./staff-gateway";
import {
  createFixturePrincipal,
  fixturePersonaOptions,
  fixtureScenarios,
  isFixtureAuthEnabled,
  isPersonaKey,
} from "./staff-fixtures";

export type StaffSessionBootstrap =
  | { status: "authenticated"; principal: StaffPrincipal }
  | { status: "anonymous"; message?: string }
  | { status: "unavailable"; message: string };

function fixturePersonaFromCookie(cookie: string | null) {
  const value = (cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("cis_staff_fixture="))
    ?.slice("cis_staff_fixture=".length);
  if (!value) return null;
  const decoded = decodeURIComponent(value);
  return isPersonaKey(decoded) ? decoded : null;
}

function cookieValue(cookie: string | null, name: string) {
  const value = (cookie ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

export async function loadStaffSession(): Promise<{
  bootstrap: StaffSessionBootstrap;
  fixtureMode: boolean;
  fixtureScenarios: typeof fixtureScenarios;
  fixturePersonas: typeof fixturePersonaOptions;
}> {
  const requestHeaders = await headers();
  const fixtureMode = isFixtureAuthEnabled();
  if (fixtureMode) {
    const persona = fixturePersonaFromCookie(requestHeaders.get("cookie"));
    return {
      bootstrap: persona
        ? { status: "authenticated", principal: createFixturePrincipal(persona) }
        : { status: "anonymous" },
      fixtureMode: true,
      fixtureScenarios,
      fixturePersonas: fixturePersonaOptions,
    };
  }

  const configured = process.env.STAFF_API_ORIGIN?.trim();
  if (!configured) {
    return {
      bootstrap: {
        status: "unavailable",
        message: "The staff sign-in service is not configured yet. Please try again later.",
      },
      fixtureMode: false,
      fixtureScenarios: [],
      fixturePersonas: [],
    };
  }

  let endpoint: URL;
  try {
    endpoint = new URL("/api/v2/staff/auth/me", configured);
    const localHostnames = new Set(["localhost", "127.0.0.1", "[::1]"]);
    if (endpoint.protocol !== "https:" && !localHostnames.has(endpoint.hostname)) throw new Error();
  } catch {
    return {
      bootstrap: {
        status: "unavailable",
        message: "The staff sign-in service is not configured correctly.",
      },
      fixtureMode: false,
      fixtureScenarios: [],
      fixturePersonas: [],
    };
  }

  try {
    const token = cookieValue(requestHeaders.get("cookie"), "cis_staff_token");
    if (!token) {
      return {
        bootstrap: { status: "anonymous" },
        fixtureMode: false,
        fixtureScenarios: [],
        fixturePersonas: [],
      };
    }
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${token}`,
        origin:
          requestHeaders.get("origin") ??
          `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost"}`,
      },
      cache: "no-store",
    });
    if (response.status === 401) {
      return {
        bootstrap: { status: "anonymous", message: "Your session has expired. Sign in again." },
        fixtureMode: false,
        fixtureScenarios: [],
        fixturePersonas: [],
      };
    }
    if (!response.ok) throw new Error();
    const payload = (await response.json()) as { data?: unknown };
    const principal = principalFromUpstream(payload.data);
    if (!principal) throw new Error();
    return {
      bootstrap: { status: "authenticated", principal },
      fixtureMode: false,
      fixtureScenarios: [],
      fixturePersonas: [],
    };
  } catch {
    return {
      bootstrap: {
        status: "unavailable",
        message: "The sign-in service is temporarily unavailable. Please retry.",
      },
      fixtureMode: false,
      fixtureScenarios: [],
      fixturePersonas: [],
    };
  }
}
