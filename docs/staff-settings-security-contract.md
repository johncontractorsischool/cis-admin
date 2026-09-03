# Staff settings and security contract

The Staff Hub exposes personal profile settings to every authenticated staff member. System-wide settings require the Laravel `superadmin` permission. The browser uses only the same-origin `/api/v1/staff/*` boundary; the gateway forwards the HTTP-only staff session to Laravel's `/api/v2/staff/*` routes.

## Security rules

- Passwords are accepted only by `PUT /profile/password`, are never returned, and are never written to browser storage or audit data. A successful password change revokes every other active staff token.
- Office IP and firewall changes prevent the current request IP from being removed or blocked. The final approved office IP cannot be deleted.
- Checkout payment visibility is authoritative in Laravel. A hidden payment method is removed from enrollment options and rejected during order creation with `payment_method_disabled`.
- At least one Staff Hub payment method must remain enabled.
- SKU identifiers are immutable after creation. Retired products are archived instead of deleted so existing orders remain intelligible.
- Activating an enrollment agreement retires the previous active agreement for the same enrollment type. Audit records store an agreement-body hash, not the body.
- Authentication and settings responses are `Cache-Control: no-store`. Fixture data exists only when development fixture mode is explicitly enabled and is never used as an API fallback.

## Endpoints

Personal routes:

- `GET /api/v2/staff/profile`
- `PATCH /api/v2/staff/profile`
- `PUT /api/v2/staff/profile/password`

Superadmin routes:

- Office locations: `/office_location`
- Class locations: `/settings/class-locations`
- Approved office IPs: `/manage_valid_ips`
- Firewall rules: `/settings/firewall`
- Checkout visibility: `/settings/checkout-payment-methods`
- SKU catalog: `/settings/skus`
- Enrollment agreements: `/settings/enrollment-agreements`

All mutating system-setting operations write a staff settings audit record with the staff ID, source IP, area, action, target, and a safe summary of the change.

