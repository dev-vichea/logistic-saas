# Mekong — Logistics SaaS v0.1

A working multi-company foundation for logistics businesses in Cambodia and Southeast Asia. Laravel owns authentication, validation, permissions and business rules. Next.js provides the responsive workspace UI.

## Included

- Sign up, cookie-based login/logout, signed email verification, password reset and queued mail.
- Create and switch organizations; edit company registration, contact and regional settings; select multiple logistics business activities.
- Invite teammates, accept/revoke/resend invitations, assign fixed organization roles and departments, remove members and transfer ownership.
- Tenant-isolated dashboard, company settings, team administration and paginated audit log.
- PostgreSQL migrations, database constraints, Redis sessions/cache/queues, API rate limits, automated feature/browser tests and CI.

Shipment, transport execution, drivers, warehouses, customs operations, document AI and finance modules are intentionally outside v0.1.

## Start with Docker Compose

Requirements: Docker Engine/Desktop with Compose v2, Node.js 22+ only if running browser tests on the host. Ports 3000 and 8025 must be available.

```sh
make setup
```

Open **http://localhost:3000**. Register an account and open the verification email in **http://localhost:8025** (Mailpit). The queue worker delivers mail automatically. Create an organization after verification.

`make setup` creates environment files if missing, builds images, generates the application key if absent, runs migrations and starts the services. It preserves an existing key. Initial image downloads and PHP extension builds can take several minutes. The development stack uses PHP 8.4, PostgreSQL 18, Redis 8, Nginx, Next.js 16 and Mailpit. Database/Redis/API ports are private; UI ports bind to loopback. Data survives `make down`.

Optional sample data, restricted to `local` and `testing` environments:

```sh
make demo
```

Sign in as `dara@mekong.test` with `MekongDemo2026!`. This creates two companies and a small team. Do not use the demo account with real business data. Plain `db:seed` creates no accounts.

```sh
make up
make down
make test
```

`make test` runs backend tests against the separate `logistics_test` database, frontend lint/type checks and a production build. Browser tests run separately:

```sh
cd frontend
npm ci
npx playwright install chromium
MAILPIT_URL=http://localhost:8025 npm run test:e2e
```

Run `make demo` first for the browser test that exercises switching between sample companies. The second browser test creates fresh accounts and an organization through the UI, receives real verification/invitation/reset emails through Mailpit and checks role changes. It is skipped if `MAILPIT_URL` is unset. Tests create disposable sample records; use a development environment. See [testing](docs/testing.md).

After changing dependency lockfiles, update the mounted dependency volumes:

```sh
docker compose run --rm app composer install
docker compose run --rm frontend npm ci
```

## Run without Docker

Requirements: PHP 8.4+ with PDO PostgreSQL, mbstring, intl, bcmath, XML, zip and OpenSSL; Composer 2; Node.js 22+; PostgreSQL 18; Redis; and an SMTP server such as Mailpit.

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
cd backend
composer install
php artisan key:generate
```

Set `DB_HOST=127.0.0.1`, `REDIS_HOST=127.0.0.1`, `MAIL_HOST=127.0.0.1` and your database credentials in `backend/.env`. Create `logistics` and `logistics_test` databases owned by that database user. Keep `APP_URL` and `FRONTEND_URL` at `http://localhost:3000`; use the same hostname in the browser.

```sh
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

In separate terminals:

```sh
cd backend
php artisan queue:work --tries=3 --timeout=60
```

```sh
cd frontend
npm ci
npm run dev
```

Next.js proxies `/api/*` and `/sanctum/*` to Laravel. The browser uses one origin; credentials never need to be stored in localStorage. Host-only encrypted session cookies are HttpOnly; the XSRF cookie is readable so Axios can send the CSRF header. Keep the `strict-origin` referrer policy: Sanctum uses the origin/referrer to recognize first-party requests.

For a local fallback without Redis, set `SESSION_DRIVER=file`, `CACHE_STORE=file`, `QUEUE_CONNECTION=database` and keep the queue worker running. `MAIL_MAILER=log` writes mail to Laravel logs instead of SMTP. The Docker stack and CI exercise Redis.

## Project map

```text
backend/app/Modules/
  Identity/          Fortify registration/reset actions and reset responses
  Organizations/     Tenant context, fixed RBAC roles, profiles and mutations
  Team/              Memberships, invitations and departments
  Audit/             Transactional tenant audit events
backend/app/Notifications/  Queued authentication mail
frontend/src/app/            App Router pages and workspace route group
frontend/src/components/     Feature UI and shadcn/ui components
frontend/src/lib/            Typed API client, data hooks and contracts
docs/                       Architecture, API contract, operations and testing
```

- [Architecture and tenant security](docs/architecture.md)
- [REST API guide](docs/api.md) and [OpenAPI 3.1 contract](docs/openapi.json)
- [Testing](docs/testing.md)
- [Operations and deployment](docs/operations.md)

## Troubleshooting

- **419 / unauthenticated after login:** use `localhost:3000` consistently; clear old cookies after changing `APP_KEY`; verify `SANCTUM_STATEFUL_DOMAINS` and trusted proxy configuration. Never disable CSRF to solve this.
- **No email:** inspect `docker compose logs queue`, then `docker compose exec app php artisan queue:failed`. Open Mailpit; no messages go to external recipients in the development stack.
- **Missing test database on an existing volume:** `docker compose exec postgres createdb -U logistics logistics_test`. The initialization SQL runs only for a fresh PostgreSQL volume.
- **Subnet/port collision:** adjust `compose.yaml`; update `TRUSTED_PROXIES`, public URLs and stateful domains when changing the topology or browser port.
- **Host Composer crashes in curl:** the host used for initial development required `php -d disable_functions=curl_multi_exec,curl_exec,curl_init /path/to/composer install`. Docker avoids this host-specific issue.
