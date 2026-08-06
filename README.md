# CIS Staff Hub

The Next.js frontend foundation for Contractor Institute staff operations. This
repository currently implements the first two migration waves from the staff
frontend handoff: authentication states, permission-shaped navigation, the
shared responsive shell, global customer search, maintenance notices, quick
actions, and a persona-aware dashboard.

The current data and authentication flows are deterministic prototypes. The app
does not connect to the Laravel database or reproduce backend business logic.
Future vertical slices should use the proposed `/api/v1/staff` JSON contracts
and keep authorization authoritative in `contractor-api`.

## Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open `/staff`. The sign-in screen includes prototype paths for approved-office
access, offsite OTP, invalid credentials, blocked accounts, disabled offsite
access, and service failure. The OTP success code is displayed within the
prototype screen.

## Validation

```bash
npm test
```

The validation suite builds the Cloudflare-compatible Vinext output and checks
the rendered staff route, metadata, centralized capability policy, and removal
of the temporary starter preview.

## Architecture notes

- `app/staff/` owns the current staff experience and compatibility redirect.
- `lib/staff.ts` centralizes principal fixtures, capabilities, and navigation.
- Session credentials, passwords, and OTPs are not persisted in browser storage.
- `.openai/hosting.json` contains only Sites project and logical resource bindings.
- API, storage, payment, authorization, exports, and operational side effects
  remain outside this frontend until their contracts are approved.
