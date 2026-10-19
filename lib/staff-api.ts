import type {
  OtpChallenge,
  StaffApiErrorBody,
  StaffAuthenticatedResult,
  StaffAuthErrorCode,
  StaffLoginResult,
  StaffPrincipal,
} from "./staff";

export class StaffApiError extends Error {
  constructor(
    public readonly code: StaffAuthErrorCode,
    message: string,
    public readonly status: number,
    public readonly attemptsRemaining?: number,
  ) {
    super(message);
    this.name = "StaffApiError";
  }
}

export const STAFF_SESSION_EXPIRED_EVENT = "cis:staff-session-expired";

function publishSessionExpired(path: string, status: number) {
  if (
    status !== 401 ||
    path === "/auth/login" ||
    path.startsWith("/auth/challenges/") ||
    path === "/logout" ||
    typeof window === "undefined"
  ) {
    return;
  }

  window.dispatchEvent(new Event(STAFF_SESSION_EXPIRED_EVENT));
}

export async function staffResponse(path: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/staff${path}`, {
      ...init,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(typeof init?.body === "string" ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new StaffApiError(
      "AUTH_UNAVAILABLE",
      "The staff service is temporarily unavailable. Please retry.",
      503,
    );
  }

  if (response.ok) return response;

  let body: (StaffApiErrorBody & { message?: string; errors?: Record<string, unknown> }) | null = null;
  try {
    body = (await response.json()) as StaffApiErrorBody;
  } catch {
    // A stable local fallback protects the UI from upstream HTML error pages.
  }

  publishSessionExpired(path, response.status);
  const validationMessage = response.status === 422 && body?.errors
    ? Object.values(body.errors).flat().filter((value): value is string => typeof value === "string").slice(0, 3).join(" ")
    : "";

  throw new StaffApiError(
    body?.error?.code ??
      (response.status === 401
        ? "SESSION_EXPIRED"
        : response.status === 403
          ? "FORBIDDEN"
          : response.status === 429
            ? "RATE_LIMITED"
            : response.status === 422
              ? "VALIDATION_ERROR"
              : "AUTH_UNAVAILABLE"),
    body?.error?.message ??
      (validationMessage || body?.message) ??
      "The requested staff operation is temporarily unavailable. Please retry.",
    response.status,
    body?.error?.attemptsRemaining,
  );
}

export async function staffRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await staffResponse(path, init);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function login(username: string, password: string) {
  return staffRequest<StaffLoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function verifyOtp(challengeId: string, code: string) {
  return staffRequest<StaffAuthenticatedResult>(
    `/auth/challenges/${encodeURIComponent(challengeId)}/verify`,
    { method: "POST", body: JSON.stringify({ code }) },
  );
}

export function resendOtp(challengeId: string) {
  return staffRequest<{ challenge: OtpChallenge }>(
    `/auth/challenges/${encodeURIComponent(challengeId)}/resend`,
    { method: "POST" },
  );
}

export function currentPrincipal() {
  return staffRequest<StaffPrincipal>("/me");
}

export function logout() {
  return staffRequest<void>("/logout", { method: "POST" });
}
