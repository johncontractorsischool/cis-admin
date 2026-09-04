# Staff Message Center contract

The Staff Hub calls the Laravel-owned Message Center through the same-origin `/api/v1/staff` gateway. Laravel exposes the implementation at `/api/v2/staff/message_center`; every route requires an authenticated staff principal and returns `Cache-Control: no-store`.

## Read operations

- `GET /message_center` lists messages with `folder`, `search`, `answer`, `priority`, `admin_id`, `page`, and `per_page` filters.
- `GET /message_center/{id}` returns the safe message detail and active staff assignment choices.
- `GET /message_center/customers?search=` performs a bounded customer lookup for explicit association.
- `GET /message_center/{id}/brochure` returns prefilled brochure conversion fields.

The list response includes inbox/archive counts and standard pagination metadata. Existing legacy rows may resolve a customer by an exact email match, but saving an association persists `customer_id`.

## Mutations

- `PATCH /message_center/{id}` updates contact details, message text, response state, priority, staff assignment, customer association, and SMS consent.
- `POST /message_center/{id}/archive` and `/unarchive` reversibly move a message between folders.
- `POST /message_center/{id}/brochure` creates one brochure request in a transaction and stores the resulting `brochure_id` on the message. Repeated conversion returns `409 MESSAGE_ALREADY_CONVERTED` and cannot create duplicates.

Permanent deletion returns `409 MESSAGE_DELETION_DISABLED`; staff use Archive instead. Passwords, authentication tokens, and unrelated customer fields are never returned by this contract.
