# Architecture and tenant security

## Boundaries

This is a modular monolith with a single Laravel deployment and PostgreSQL database. Modules live in `app/Modules`; the shared `User` identity is outside tenant ownership. Identity integrates Fortify, Organizations owns the tenancy and role model, Team owns invitations/departments, and Audit records changes. Cross-module writes use application actions and transactions. HTTP controllers validate and translate requests; Next.js contains presentation, form state and API orchestration only.

Authentication uses Sanctum first-party session cookies and Fortify’s headless endpoints. Personal access tokens and social authentication are not exposed. Verification and reset links point to Next.js; Next.js submits the signed verification path unchanged to Laravel. Verification, password reset and invitation messages run on the queue after database commits.

## Request isolation

Every tenant resource lives under `/api/v1/organizations/{organization}`. `ResolveOrganization` looks up a membership using **both the route organization ID and the authenticated user ID**, returning 404 when no membership exists. It creates an immutable request-local `OrganizationContext`; this is never a static/global tenant variable. Child records are always fetched through relationships on that context’s organization. Client-supplied tenant identifiers are not mass assigned.

The session’s selected organization is a navigation preference. It cannot grant access and is not used to scope queries. Explicit organization IDs also keep requests from two tabs independent when a user switches companies. `/me` drops stale selections when a membership is revoked. UI permissions are informational; Laravel authorizes every protected action.

Writes acquire `SELECT ... FOR UPDATE` on the organization and re-read the actor’s membership before checking permissions. All tenant writes use this lock order, including invitation acceptance. This prevents stale role decisions, simultaneous ownership transfers, and accept/revoke races. Organization-wide locking favors clear correctness at v0.1 scale. Add narrower locks with measured contention when throughput requires them.

Department references in memberships and invitations use composite `(organization_id, department_id)` foreign keys. PostgreSQL rejects foreign-tenant assignments even if an application query is wrong. Unique keys prevent duplicate memberships, department names and pending invitation emails per organization. A partial unique index allows at most one owner per organization. Application workflows preserve exactly one owner; ownership must transfer before demoting/removing an owner. There is no account/organization deletion endpoint in v0.1; any future account deletion must enforce the same invariant.

## Fixed role matrix

| Capability | Owner | Admin | Manager | Member | Viewer |
|---|---|---|---|---|---|
| View organization, dashboard, members and departments | Yes | Yes | Yes | Yes | Yes |
| Edit company profile | Yes | Yes | No | No | No |
| Invite, revoke, edit and remove members | Yes | Yes | No | No | No |
| Manage departments | Yes | Yes | Yes | No | No |
| Read audit log | Yes | Yes | No | No | No |
| Transfer ownership | Yes | No | No | No | No |

Roles are scoped to memberships. The same user can be an admin in one company and a viewer in another. Member and viewer intentionally have the same read permissions in this foundation; future operational modules can distinguish them. Custom roles are outside v0.1. An admin can assign any non-owner role. Ownership changes only through the dedicated owner-authorized transfer action.

## Invitations

Invitations contain 64-character cryptographically random tokens. Only SHA-256 token hashes are stored in PostgreSQL; raw tokens are only sent through queued email. The token is single use, expires after seven days, and requires a verified signed-in account with the exact normalized recipient email. Acceptance is explicit. Existing memberships are never downgraded or overwritten on acceptance. Reinviting the same email rotates its token and can change the offered role/department. Revocation removes the token immediately. An expired invitation remains visible to administrators until resent/revoked.

Queue payloads and mailboxes contain links with secrets, so Redis, failed-job storage and email infrastructure must be access controlled. API serialization hides token hashes. Audit metadata contains explicit record IDs, changed field names and assigned roles, never passwords, tokens or company field values.

## Audit and consistency

Successful organization, membership, invitation, department and ownership mutations append an event in the same database transaction as the change. A rollback rolls back both. Audit APIs are read-only, organization-scoped and owner/admin-only. These are application audit records, not a cryptographically tamper-proof ledger; production database operators retain access. Authentication attempts use Fortify throttling rather than tenant audit events because they may have no tenant context.

Reads are paginated (members/invitations/audit 30; departments 100), and tenant/foreign-key columns are indexed. The dashboard uses database counts and a bounded recent-event query. Regional country/currency/activity catalogs are centralized in Laravel, with Khmer-compatible UTF-8 strings and IANA timezones. Monetary transaction logic is outside this release.

## Adding future modules

Add a module directory, its migrations, actions, requests and versioned routes. Reuse `ResolveOrganization` and pass `OrganizationContext` into tenant operations. Fetch resources through scoped relationships, add database tenant constraints, extend the role permission catalog, and record changes in the same transaction. Add tests that try another tenant’s IDs before exposing new UI. Queued jobs must carry explicit organization/resource IDs and resolve scope again; never depend on an HTTP session or a retained global tenant.

Shipment, transport, driver, warehouse, customs, document AI and finance are extension points only. There are no placeholder tables, fake workflows or future-module menu entries.
