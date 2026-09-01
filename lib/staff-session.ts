import { headers } from "next/headers";
import type { StaffPrincipal } from "./staff";
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

function isPrincipal(value: unknown): value is StaffPrincipal {
  if (!value || typeof value !== "object") return false;
  const principal = value as Partial<StaffPrincipal>;
  return (
    typeof principal.id === "number" &&
    typeof principal.username === "string" &&
    typeof principal.name === "string" &&
    typeof principal.email === "string" &&
    Array.isArray(principal.capabilities) &&
    principal.capabilities.every((capability) => typeof capability === "string")
  );
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
    endpoint = new URL("/api/v1/staff/me", configured);
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
    const response = await fetch(endpoint, {
      headers: {
        accept: "application/json",
        cookie: requestHeaders.get("cookie") ?? "",
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
    const principal: unknown = await response.json();
    if (!isPrincipal(principal)) throw new Error();
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
