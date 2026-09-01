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
