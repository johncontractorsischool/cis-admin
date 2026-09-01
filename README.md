# CIS Staff Hub

The Next.js frontend and same-origin authentication gateway for Contractor
Institute staff operations. Production mode now restores a Laravel-owned staff
session on the server and exposes only the secure foundation screen. Operational
workflows remain unavailable until their API contracts are approved.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Authentication uses API mode by default. Set `STAFF_API_ORIGIN` to the Laravel
origin; the browser will continue to call the same-origin `/api/v1/staff/*`
gateway routes.

For deterministic local development only, set:

```bash
STAFF_AUTH_MODE=fixture
```

Fixture mode is ignored when `NODE_ENV=production`. Its sign-in paths are
`approved`, `offsite`, `denied`, `blocked`, `offsite-disabled`, and `service`,
all with password `staff-demo`. The local OTP screen displays its fixture code.
The persona selector and mock operational dashboard also exist only in this
explicit mode.

## Configuration

- `STAFF_API_ORIGIN` — absolute Laravel origin. HTTPS is required except for
  loopback development addresses.
- `STAFF_AUTH_MODE=fixture` — optional local-only authentication adapter.

The production reverse proxy must preserve `Cookie` and `Set-Cookie`, forward
the request origin and client IP, and must not cache authentication responses.
Laravel owns session creation, revocation, authorization, rate limiting, and OTP
attempt enforcement. See [the staff authentication contract](docs/staff-auth-contract.md).

## Validation

```bash
npm run check
```

This runs linting, TypeScript checks, the Cloudflare-compatible Vinext build,
rendered production assertions, gateway failure tests, and contract checks.

## Architecture notes

- `/staff` performs session restoration during server rendering.
- `/api/v1/staff/*` is the no-store, same-origin gateway to Laravel.
- `lib/staff.ts` contains shared public contracts and capability-aware navigation.
- Fixture principals and deterministic responses are isolated in
  `lib/staff-fixtures.ts` and cannot be enabled in production.
- Credentials, passwords, OTPs, and session tokens are never written to browser
  storage or application logs.
- D1 remains unused; authorization and backend business logic stay in Laravel.
