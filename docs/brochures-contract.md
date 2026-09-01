# Brochure staff contract

The CIS-Admin Brochure section mirrors the staff workflows in `contractorsischool` while treating that repository as a read-only reference. Live data and mutations are served by `contractor-api` through CIS-Admin's authenticated, same-origin `/api/v1/staff` gateway.

## Page inventory

- `/staff/brochures/new` lists active brochure requests that have not received a letter.
- `/staff/brochures/followups` lists callbacks scheduled for today and supports bulk reassignment.
- `/staff/brochures/request` creates a brochure request with source, classification, language, assignee, and follow-up data.
- `/staff/brochures/search` provides advanced filters, archived records, pagination, and CSV export.
- `/staff/brochure-templates` manages staff-scoped brochure email templates and test emails.
- `/staff/brochures/{id}` provides editing, status changes, enrollment handoff, template-based email, and email history.

## API ownership

`contractor-api` owns brochure persistence, validation, staff authorization, options, callback reassignment, CSV export, template CRUD, email rendering/sending, and history. CIS-Admin does not persist brochure records or staff credentials in browser storage. Fixture mode implements the same URLs for local UI validation only.
