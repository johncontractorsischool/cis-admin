# Customer devices staff contract

`/staff/customer-devices` mirrors the legacy Contractor School device audit while using the authenticated contractor-api staff surface.

## Browser routes

- `GET /staff/customer-devices` renders the authenticated audit workspace.
- Browser requests use the same-origin `/api/v1/staff/*` gateway. The contractor-api bearer token remains in an HTTP-only cookie and is never exposed to client JavaScript or browser storage.

## Upstream operations

| Browser operation | contractor-api operation | Result |
| --- | --- | --- |
| List and search | `GET /api/v2/staff/customer-devices` | Paginated records joined to customer email |
| Export | `GET /api/v2/staff/customer-devices/export-customer-devices` | Date-range CSV using the legacy multiple-device rule |
| Delete | `DELETE /api/v2/staff/customer-devices/{id}` | Permanently removes one recorded device fingerprint |

Search accepts customer email, IP address, or fingerprint and requires at least three characters when present. List payloads expose only device IDs, customer ID/email, device type, fingerprint, IP address, location, user agent, and timestamps. Customer credentials and unrelated profile fields are excluded.

The export defaults to the previous 30 days. As in the legacy page, it includes customers who have multiple recorded devices and at least one device recorded inside the selected date range.
