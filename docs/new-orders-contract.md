# New orders staff contract

`/staff/new_order` mirrors the legacy Contractor School unshipped-order queue through the authenticated contractor-api staff API.

## Operations

| Staff action | contractor-api operation |
| --- | --- |
| List/search unshipped orders | `GET /api/v2/staff/new_order` |
| Load the complete edit/print record | `GET /api/v2/staff/new_order/{id}` |
| Update customer, salesperson, and shipping data | `PATCH /api/v2/staff/new_order/{id}` |
| Mark one order shipped | `POST /api/v2/staff/new_order/shipped/{id}` |
| Mark selected orders shipped | `POST /api/v2/staff/new_order/shipped_selected` |
| Prepare selected shipping labels | `POST /api/v2/staff/new_order/labels` |
| Prepare selected invoices | `POST /api/v2/staff/new_order/invoices` |

The API reads `tb_order_history`, matching the legacy `OrderHistory` model. It returns only order fulfillment fields and safe salesperson choices. Customer credentials, payment credentials, and unrelated customer profile data are excluded.

Non-shipping admins see only orders assigned to their staff ID, matching the legacy controller. Shipping staff and superadmins can work across the full queue. Translator, instructor, and insurance-only accounts do not receive queue access unless they also have shipping access.

Label and invoice actions submit `{ ids: number[] }` (1–100 unique queue records) through the authenticated same-origin gateway. Laravel builds escaped, print-ready HTML from the authorized records; the browser opens the system print dialog so staff can print or save as PDF without exposing the contractor-api bearer token to browser JavaScript.
