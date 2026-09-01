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

The API reads `tb_order_history`, matching the legacy `OrderHistory` model. It returns only order fulfillment fields and safe salesperson choices. Customer credentials, payment credentials, and unrelated customer profile data are excluded.

Non-shipping admins see only orders assigned to their staff ID, matching the legacy controller. Shipping staff and superadmins can work across the full queue. Translator, instructor, and insurance-only accounts do not receive queue access unless they also have shipping access.

Label and invoice actions load the selected records through the authenticated same-origin gateway and open sanitized print views. Staff can print them or save them as PDFs without exposing the contractor-api bearer token to browser JavaScript.
