# Staff Authentication Contract

Laravel is authoritative for staff identity, session state, access policy,
network-location policy, OTP rules, and rate limiting. The Staff Hub forwards
these requests through the same public origin under `/api/v1/staff`.

## Transport and security

- Laravel issues an opaque session cookie with `HttpOnly`, `Secure`,
  `SameSite=Lax`, and `Path=/`. The cookie is never exposed in JSON.
- Authentication responses include `Cache-Control: no-store, max-age=0` and
  `Pragma: no-cache`.
- Laravel validates the forwarded browser `Origin` before state-changing
  requests and rejects unexpected origins.
- The gateway forwards `Cookie`, every `Set-Cookie` header, `Origin`,
  `X-Forwarded-Host`, `X-Forwarded-Proto`, and the trusted client address.
- Passwords and OTP values must not be logged by either service.

## Shared representations

```ts
interface StaffPrincipal {
  id: number;
  username: string;
  name: string;
  email: string;
  staffType: string | null;
  capabilities: string[];
  navigationBadges?: {
    questionFeedback?: number;
    newSurveys?: number;
  };
}

interface OtpChallenge {
  id: string;
  maskedDestination: string;
  expiresAt: string; // ISO 8601
  resendAt: string; // ISO 8601
  attemptsRemaining: number;
}

interface ErrorResponse {
  error: {
    code:
      | "INVALID_CREDENTIALS"
      | "ACCOUNT_INACTIVE"
      | "OFFSITE_DISABLED"
      | "INVALID_OTP"
      | "CHALLENGE_EXPIRED"
      | "RATE_LIMITED"
      | "SESSION_EXPIRED"
      | "AUTH_UNAVAILABLE"
      | "VALIDATION_ERROR";
    message: string;
    attemptsRemaining?: number;
  };
}
```

Capabilities shape frontend navigation but never replace backend authorization.

## Endpoints

### `POST /api/v1/staff/auth/login`

Request: `{ "username": string, "password": string }`.

Approved-office success returns `200`:

```json
{ "status": "authenticated", "principal": {} }
```

Offsite verification returns `200`:

```json
{ "status": "otp_required", "challenge": {} }
```

Invalid credentials return `401`; an inactive account or disabled offsite
access returns `403`; rate limiting returns `429`; upstream unavailability
returns `503`.

### `POST /api/v1/staff/auth/challenges/{id}/verify`

Request: `{ "code": string }`. A valid seven-digit code returns `200` with
`{ "status": "authenticated", "principal": {} }`. An invalid code returns
`422 INVALID_OTP` with the server-owned `attemptsRemaining`; an expired
challenge returns `410 CHALLENGE_EXPIRED`; rate limiting returns `429`.

### `POST /api/v1/staff/auth/challenges/{id}/resend`

Returns `200` with `{ "challenge": {} }`. Laravel rotates the code, invalidates
the previous value, and supplies new expiry, resend, and attempt values.

### `GET /api/v1/staff/me`

Returns the `StaffPrincipal` with `200`. A missing, revoked, or expired session
returns `401 SESSION_EXPIRED`.

### `POST /api/v1/staff/logout`

Revokes the server session, expires the cookie, and returns `204` with no body.
Calling logout for an already-expired session may also return `204`.

## Deployment acceptance

Before production enablement, verify login, OTP, refresh-based session restore,
logout cookie removal, expired-session recovery, origin rejection, no-store
headers, and capability enforcement through the deployed same-origin URL.
