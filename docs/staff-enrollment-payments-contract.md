# Staff enrollment and payments contract

The Staff Hub calls these routes through the same-origin `/api/v1/staff/*` gateway. Laravel exposes them under `/api/v2/staff/*`. Every route requires an authenticated staff session and the `live_pending_orders` permission (superadmins bypass the permission flag), is rate limited, and responds with `Cache-Control: no-store, private`.

## Routes

- `GET /enrollments/options?customer_id={id}` returns the existing customer, staff-visible active SKUs, classifications, shipping methods, payment methods, the maximum delegated discount, and public Authorize.Net tokenization configuration.
- `POST /enrollments/quote` accepts the customer ID, exact SKU, classification ID, shipping method, and optional discount. Laravel resolves inventory prices and calculates every amount; client-supplied totals are ignored.
- `POST /enrollments/orders` accepts the quote ID, a UUID idempotency key, billing and shipping information, instructions, and one payment shape. A successful request creates one `tb_order_history` record and returns its ID.

Quotes expire after 15 minutes and can be consumed once. Idempotency keys prevent duplicate orders and duplicate charges. Transactions that charge successfully but fail while persisting the order are marked `reconciliation_required`; the API tells staff not to retry.

## Discounts

Discounts may be `none`, `fixed`, or `percent`. Any discount requires an audit reason. Standard authorized staff are limited to 25 percent of the list subtotal; superadmins may approve up to the full subtotal. Laravel prorates configured product tax after a discount and adds the selected shipping amount.

## Payment boundary

Cash requires an explicit received-cash acknowledgment. Check payments require a bank name and check number; persisted records retain the bank label and only the check number’s last four digits. Card payments are disabled until all Authorize.Net configuration values are present.

When card payments are enabled, the browser loads Authorize.Net Accept.js directly. PAN, expiration, and CVV are held only in uncontrolled inputs long enough to call Accept.js. Authorize.Net returns an opaque, single-use token. Only that token is sent through the Staff Hub gateway to Laravel. Raw card fields are explicitly rejected by Laravel and never enter browser storage, application logs, quotes, transaction snapshots, or order records.

Required server configuration:

- `STAFF_PAYMENTS_CARD_ENABLED=true`
- `AUTHORIZE_NET_ENVIRONMENT=sandbox` or `production`
- `AUTHORIZE_NET_LOGIN_ID`
- `AUTHORIZE_NET_TRANSACTION_KEY`
- `AUTHORIZE_NET_CLIENT_KEY`

Production enablement requires a successful sandbox charge/decline/idempotency run, PCI review of the deployed page and proxy, webhook or settlement reconciliation ownership, and an operations runbook for `reconciliation_required` transactions.

## Stable business errors

- `CUSTOMER_NOT_FOUND`
- `SKU_UNAVAILABLE`
- `SKU_PRICE_INVALID`
- `CLASSIFICATION_UNAVAILABLE`
- `SHIPPING_REQUIRED`
- `DISCOUNT_REASON_REQUIRED`
- `DISCOUNT_LIMIT_EXCEEDED`
- `QUOTE_NOT_FOUND`
- `QUOTE_EXPIRED`
- `PAYMENT_DATA_NOT_ALLOWED`
- `PAYMENT_DECLINED`
- `PAYMENT_FAILED`
- `PAYMENT_UNAVAILABLE`
- `PAYMENT_IN_PROGRESS`
- `PAYMENT_RECONCILIATION_REQUIRED`
- `ORDER_SCHEMA_INVALID`
