# Staff global search contract

The Staff Hub sends `GET /api/v1/staff/search?q={query}` through its same-origin gateway. The gateway forwards the authenticated request to `GET /api/v2/staff/search` in Laravel. Queries must contain 2–100 characters and are rate-limited by Laravel.

The response contains `students`, `orders`, `brochures`, and `applications` groups. Every result has a stable key, type, record ID, display title, supporting text, identifier, and a Staff Hub-relative `href`. Laravel searches customer names, current and previous email addresses, normalized phone numbers, customer IDs, order numbers, and iApplication application/app-fee numbers.

Order and application links resolve through authenticated, read-only record endpoints:

- `GET /api/v1/staff/orders/{id}`
- `GET /api/v1/staff/applications/{id}`

All responses use `Cache-Control: no-store`. Search results contain only fields needed to identify and open a record. Passwords, session tokens, payment credentials, and raw application payloads are excluded. Query values are not placed in browser storage or application logs.
