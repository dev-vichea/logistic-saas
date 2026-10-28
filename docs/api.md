# REST API v1

The machine-readable contract is [openapi.json](openapi.json), importable into Swagger Editor, Postman and other OpenAPI clients. Fortify auth and application routes are versioned under `/api/v1`; Sanctum’s CSRF bootstrap endpoint remains `/sanctum/csrf-cookie`.

## Authentication and requests

1. `GET /sanctum/csrf-cookie` with credentials.
2. `POST /api/v1/auth/login` or `/register` with JSON and credentials.
3. Send `Accept: application/json`, the session cookie and, on mutations, `X-XSRF-TOKEN` with the decoded XSRF cookie value. Axios is configured to do this automatically.
4. Include the first-party Origin/Referer. In browsers the configured `strict-origin` referrer policy does this for GETs without leaking paths. Laravel 13 also recognizes valid same-origin fetch metadata for CSRF protection; non-browser clients should send the token.

The public browser and API share one origin. No bearer tokens are issued. Authenticated but unverified users can call `/me`, logout and the verification endpoints; organization/catalog/team endpoints require a verified email.

## Main routes

| Method | Path (under `/api/v1`) | Access / behavior |
|---|---|---|
| POST | `/auth/register` | Name, email, password, password_confirmation; 201; logs in; queues verification |
| POST | `/auth/login` | Email, password; 200 |
| POST | `/auth/logout` | Authenticated; 204; invalidates session |
| POST | `/auth/forgot-password` | Email; generic 200 for existing/unknown addresses |
| POST | `/auth/reset-password` | Email, token, password, password_confirmation; 200 |
| GET | `/auth/email/verify/{id}/{hash}` | Authenticated matching user, unexpired signed URL; 204 |
| POST | `/auth/email/verification-notification` | Authenticated; resend verification |
| GET | `/me` | User and selected organization ID |
| GET | `/catalog` | Verified; countries, currencies, activities and role permissions |
| GET / POST | `/organizations` | List memberships / create organization |
| GET / PATCH | `/organizations/{organization}` | View / owner-admin profile update |
| POST | `/organizations/{organization}/switch` | Select a company the caller belongs to |
| GET | `/organizations/{organization}/dashboard` | Counts and permitted recent activity |
| GET | `/organizations/{organization}/audit-events` | Owner/admin; paginated |
| POST | `/organizations/{organization}/transfer-ownership` | Owner; membership_id; 204 |
| GET | `/organizations/{organization}/members` | Members; paginated |
| PATCH / DELETE | `/organizations/{organization}/members/{member}` | Owner/admin; member means **membership ID**, not user ID |
| GET / POST | `/organizations/{organization}/invitations` | Owner/admin; list or send/resend |
| DELETE | `/organizations/{organization}/invitations/{invitation}` | Owner/admin; revoke |
| POST | `/invitations/accept` | Verified matching email; raw token; 200 |
| GET / POST | `/organizations/{organization}/departments` | Members read; owner/admin/manager create |
| PATCH / DELETE | `/organizations/{organization}/departments/{department}` | Owner/admin/manager |

Registration/reset passwords require at least 12 characters including letters and numbers, with confirmation. Emails normalize to lowercase at registration/login/reset. Invitation addresses must be lowercase (the UI normalizes them).

## Organization input

Create and PATCH both require a complete core profile; nullable optional fields may be omitted. Business activities must be distinct catalog keys.

```json
{
  "name": "Mekong Freight",
  "legal_name": "Mekong Freight Co., Ltd.",
  "email": "hello@example.com",
  "city": "Phnom Penh",
  "country_code": "KH",
  "timezone": "Asia/Phnom_Penh",
  "currency": "USD",
  "activities": ["road_transport", "freight_forwarding"]
}
```

Invitation input: `email`, a non-owner `role`, optional nullable `department_id`. PATCH member input: `role` and optional nullable `department_id`; omission unassigns the department. Send the current department ID to preserve it. Department input: `name` and optional nullable `description`. Deleting a department unassigns its members and invitations without deleting people.

## Responses and errors

Single resources and catalogs use `{ "data": ... }`. Collections use Laravel pagination (`data`, `current_page`, `last_page`, `per_page`, `total`, links). Organization listing includes the caller’s `role` and `permissions`; create/update/accept return the organization itself, so refresh the organization listing for current permissions.

- 401: no valid authenticated session.
- 403: email unverified, missing permission, signature invalid or invitation recipient mismatch.
- 404: tenant membership/resource/token unavailable; cross-tenant records are hidden.
- 409: database uniqueness conflict, including a concurrent duplicate write.
- 410: invitation expired.
- 419: CSRF token/session mismatch.
- 422: validation errors (`message`, `errors` field map) or owner invariant violation.
- 429: rate limited; respect `Retry-After`.

API responses set `Cache-Control: no-store, private`. General verified APIs allow 120 requests/minute per user; organization creation 20/hour; invitation sends/acceptance 10/minute. Authentication has an IP limit of 20/minute and a login limit of 5/minute per normalized email/IP. Verification resend/signature routes also use Fortify’s own throttles.


## v0.2 business partner directory

All paths below are relative to `/api/v1/organizations/{organization}/partners`. Every route uses the existing authenticated, verified organization context. The OpenAPI contract includes all 17 new operations.

| Method | Path | Permission / behavior |
|---|---|---|
| GET | `/catalog` | `partners.view`; business roles, global countries and location types |
| GET | `/` | `partners.view`; search, filter, sort and paginate |
| POST | `/` | `partners.manage`; create external company profile |
| GET / PATCH | `/{partner}` | View / partially update an active partner |
| POST | `/{partner}/archive` or `/{partner}/restore` | `partners.archive`; idempotent lifecycle transitions |
| GET / POST | `/{partner}/contacts` | List / create contacts |
| GET / PATCH / DELETE | `/{partner}/contacts/{contact}` | View / update / delete a contact |
| GET / POST | `/{partner}/locations` | List / create reusable locations |
| GET / PATCH / DELETE | `/{partner}/locations/{location}` | View / update / delete a location |

Owners, admins, managers and members can manage partner profiles and child records. Only owners/admins/managers can archive or restore. All organization roles can view. Child writes require `partners.manage`, and all profile/child writes return 409 while the parent is archived. Cross-tenant or unrelated parent/child IDs return 404. Partner hard deletion is not exposed.

Partner creation requires `name` (max 200), `country_code` (global ISO alpha-2 choice) and a nonempty, distinct `roles` array. Roles are `customer`, `shipper`, `consignee`, `supplier`, `carrier`, `freight_forwarder`, `broker`, and `warehouse_operator`. Optional fields: `legal_name`, `code`, `registration_number`, `tax_number`, `email`, `phone`, HTTP(S) `website`, and `notes` (max 5000). `code` is trimmed, uppercased and unique within the organization, including archived records. External partners do not create Mekong accounts.

Contact creation requires `name`; optional fields are `job_title`, `email`, `phone`, `notes` (max 2000), and boolean `is_primary`. Location creation requires `name`, `type`, `address_line_1`, `city`, and `country_code`; optional fields are `address_line_2`, `state`, `postal_code`, `latitude`, `longitude`, `notes` and `is_primary`. Types are `office`, `warehouse`, `port`, `airport`, `yard`, `delivery_site`, and `other`. Both coordinates must be populated or both null; latitude is -90 to 90 and longitude -180 to 180. Coordinates are stored to seven decimal places. Location country may differ from company HQ.

PATCH is partial for these new resources: omitted fields are retained, optional fields can be cleared with null, and required fields cannot be cleared. The server validates the resulting coordinate pair on partial location updates. Tenant IDs, partner reassignment and direct `archived_at` writes are prohibited. Changing a primary atomically unsets the previous one; removing a primary does not automatically promote another record.

Partner GET list/detail includes contact and location counts. Child lists paginate at 25, ordered primary first then ascending ID. Partner list defaults to 20 rows, active status and case-insensitive ascending company name. Supported query parameters:

| Parameter | Values |
|---|---|
| `q` | Up to 120 characters; literal case-insensitive substring, including numeric `0` |
| `status` | `active` (default), `archived`, `all` |
| `role` | One of the eight business roles |
| `country_code` | Global alpha-2 country choice |
| `sort` | `name`, `code`, `country_code`, `created_at`, `updated_at` |
| `direction` | `asc` or `desc` |
| `page` | Integer 1–1,000,000 |
| `per_page` | Integer 1–100; UI offers 20/50/100 |

Search covers company/legal names, reference code, email, phone, tax/registration identifiers, contact names/emails/phones and location names/address line 1/cities. `%`, `_` and backslashes are escaped as literal search characters. Filters combine with AND. Sort columns are allowlisted, nullable values sort last and ID is the stable tie-breaker. Existing general API throttling and no-store headers apply.

Audit actions are `partner.created`, `partner.updated`, `partner.archived`, `partner.restored`, `partner_contact.created|updated|deleted`, and `partner_location.created|updated|deleted`. Metadata contains IDs and changed field names, never contact/address/note values.
