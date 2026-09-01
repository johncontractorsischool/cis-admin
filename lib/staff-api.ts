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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/staff${path}`, {
      ...init,
      credentials: "include",
      headers: {
        accept: "application/json",
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new StaffApiError(
      "AUTH_UNAVAILABLE",
      "The sign-in service is temporarily unavailable. Please retry.",
      503,
    );
  }

  if (response.ok) {
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  let body: StaffApiErrorBody | null = null;
  try {
    body = (await response.json()) as StaffApiErrorBody;
  } catch {
    // A stable local fallback protects the UI from upstream HTML error pages.
  }

  throw new StaffApiError(
    body?.error.code ?? "AUTH_UNAVAILABLE",
    body?.error.message ??
      "The sign-in service is temporarily unavailable. Please retry.",
    response.status,
    body?.error.attemptsRemaining,
  );
}

export function login(username: string, password: string) {
  return request<StaffLoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function verifyOtp(challengeId: string, code: string) {
  return request<StaffAuthenticatedResult>(
    `/auth/challenges/${encodeURIComponent(challengeId)}/verify`,
    { method: "POST", body: JSON.stringify({ code }) },
  );
}

export function resendOtp(challengeId: string) {
  return request<{ challenge: OtpChallenge }>(
    `/auth/challenges/${encodeURIComponent(challengeId)}/resend`,
    { method: "POST" },
  );
}

export function currentPrincipal() {
  return request<StaffPrincipal>("/me");
}

export function logout() {
  return request<void>("/logout", { method: "POST" });
}
