# Student Management Contract

The CIS Staff Hub mirrors the legacy Contractors Intelligence School student
directory and detail workspace while using contractor-api as its only runtime
data source. The legacy Laravel repository remains a read-only behavior and
field reference.

## Browser routes

- `GET /staff/students` — searchable and filterable student directory.
- `GET /staff/students/new` — create a student profile.
- `GET /staff/students/{id}` — profile, enrollment/application dates,
  corporation summary, online courses, live classes, class schedules,
  subscribed tests, documents, customer notes, and staff actions.

## Same-origin API gateway

The browser calls `/api/v1/staff/students...`. The gateway forwards requests to
the equivalent `/api/v2/staff/students...` contractor-api route with the
server-held staff token. Responses are always non-cacheable and upstream tokens
or cookies are never forwarded to the browser.

The first slice uses:

- `GET /students` with search, account, date, and pagination query parameters.
- `POST /students` to create the core profile.
- `GET /students/{id}` and `PATCH /students/{id}` for the full record.
- `POST /students/enable_disable/{id}` for account status.
- `POST /students/update-password/{id}` for password reset.
- `POST /students/copy-customer-pbia/{id}` for the PBIA queue.
- `POST /students/{id}/send_email` for staff email actions.

The detail response deliberately excludes password hashes, legacy encrypted
password fields, staff credentials, and bearer tokens.

## Complete-student workflow

The paired `codex/complete-student-workflows` contractor-api branch adds these
real operations. Deploy the API to **development first**, then run the matching
frontend; older APIs return an explicit error for new operations, not fixtures.

- Profile options come from `/students/create` (classification IDs and enrollment
  categories), never free-text classification codes. All detail collections have
  stable empty defaults. Legacy course expiration storage remains `MM/DD/YYYY`
  for existing student-access consumers; the UI/API use ISO dates.
- Access options: `/students/{id}/access-options`. Add/edit/remove:
  `/students/{id}/access/{online_courses|live_classes|subscribed_tests|class_managements}`
  and `/{record}`. Child operations are scoped to the student. Spanish legacy
  test access is removal-only; schedules validate live-class entitlements.
- Add attributed notes: `POST /students/{id}/notes`. Current and previous email
  note history is returned in detail.
- Documents: multipart `POST /students/{id}/documents`, and authenticated
  `GET`/`DELETE /students/{id}/documents/{attachment|application}/{record}`.
  Files are encrypted/private, downloads stay behind the gateway, and removal
  retains a private recovery copy. No browser storage or public file URLs.
- Email history: `/students/email_history/{id}`. Staff-owned template choices:
  `/students/{id}/email-templates`; resolving a template uses
  `/student_brochure_email_template/{template}/{student}`. Send requests include
  a UUID idempotency key. Delivery failures preserve the draft and show recorded
  status. History renders as text, never executable template HTML.
- Saved fee numbers, law/trade exam dates, and premium changes return
  `meta.synchronization`. Retry with `POST /students/{id}/synchronize`; account
  prescreen uses `/students/{id}/iapplication-prescreen`. Disabled/unconfigured
  destinations are shown, not treated as successful synchronization.

Laravel requires `students.view` for reads and `students.create` (the existing
student-management capability) for writes. The UI hides write controls for
viewers; protected 401s return the entire shell to login.

External synchronization is **off by default**. API configuration must opt in,
set development service URLs/keys, and allowlist their exact HTTPS hosts. Do not
enable existing production URL defaults for development testing. Verify the
document disk and existing FileVault key before testing legacy downloads.

Validation: `npm run check` includes executable transport/render tests in
`tests/student-workspace-behavior.test.mjs`. The paired API feature suite uses
SQLite, fake private files, mail, and HTTP; it does not mutate real customers.
The final development smoke test must use a designated test student and verify
file, mail, and external-system configuration. Legacy trace/device/corporation
administration and evening-class automation are outside this student-core slice.
