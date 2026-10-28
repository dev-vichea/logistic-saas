# Testing

## Backend

Run `make test` with Docker or, locally:

```sh
cd backend
cp .env.testing.example .env.testing
# Set your database host/credentials in .env.testing.
php artisan key:generate --env=testing
php artisan test --compact
```

The test suite uses PostgreSQL, not SQLite. `RefreshDatabase` builds the schema and wraps tests in transactions. The suite refuses to run unless the database name ends in `_test`. Always use a **dedicated test database**: Laravel may recreate tables. The default database is `logistics_test`; process environment values override the defaults in phpunit.xml. Normal application data must never be used for tests.

Coverage includes signup, login/logout, password validation/reset/token replay, verification signature/user/expiry, login throttling, account-enumeration protection, all five RBAC roles, guessed tenant IDs, cross-tenant member/department/invitation access, database composite foreign keys, owner protection/transfer, stale authorization, invitation token hashing/rotation/expiry/revocation/single use/recipient verification, department deletion, tenant counts/audit, rollback consistency and stale organization selection.

Laravel disables CSRF verification in its feature-test environment. The real browser suite checks a credentialed mutation without a CSRF header/fetch-metadata assertion is rejected, and verifies cookie logout against the running server.

## Frontend and browser

```sh
cd frontend
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
MAILPIT_URL=http://localhost:8025 npm run test:e2e
```

The application and queue worker must already be running. Seed the optional demo account first (`make demo`); `E2E_EMAIL`, `E2E_PASSWORD` and `E2E_BASE_URL` can override browser test defaults. The demo test expects the two sample companies. Mailpit-backed tests create new accounts, verify emails using actual delivered links, create/update a company, create/edit/delete a department, invite and register a second user, accept the invitation, change their role, observe permissions after reload, read audit events and reset/login with a new password. No application endpoints or responses are mocked.

The first test checks a 390px mobile viewport, menu navigation, horizontal overflow, organization switching, HttpOnly session cookies and logout. Failures produce screenshots and Playwright traces in ignored `test-results/`. The full email flow is skipped when `MAILPIT_URL` is absent; CI sets it, and release verification should too.

CI runs backend checks with PHP 8.4/PostgreSQL 18 and browser integration with Redis sessions/cache/queues and Mailpit. `npm run build` checks a production bundle; browser tests use `next start`. Docker Compose config/image builds validate the development topology separately.

`tests/e2e/sidebar.spec.ts` checks the complete module hierarchy, disabled planned entries, permission-aware navigation search, active links, persisted compact mode, role permissions and contact/location navigation. Mobile checks cover drawer focus restoration, keyboard search, scrolling, navigation and horizontal overflow. Future operational modules remain disabled and have no placeholder routes.


## v0.2 partner regression coverage

`tests/Feature/PartnerDirectoryTest.php` exercises all five membership roles, verified/guest access, parent/child tenant boundaries, cross-parent IDs, database foreign keys, multi-role CRUD, literal/numeric search, filters/sort/pagination, code uniqueness, archive/restore invariants, contacts, primary reassignment, addresses, coordinate validation and stale permissions. The existing foundation tests remain in the full suite.

`tests/e2e/partners.spec.ts` drives real partner profile, contact and location forms, server-side coordinate validation, archive/restore, query filters, cross-organization visibility, mobile overflow and pagination using 21 PostgreSQL-backed records. The existing foundation email scenario also checks that its real viewer account can see the directory but cannot add partners. Run the complete suite with Mailpit enabled for all coverage. Browser fixtures create isolated test organizations and disposable development data; use a dedicated development instance. Fixture API requests honor `Retry-After` without disabling application limits. Repeated runs can exhaust the demo account’s 20-organizations/hour quota; use a fresh dedicated instance when that happens.
