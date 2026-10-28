# Operations and deployment

## Configuration

`backend/.env.example` documents the Compose defaults. `frontend/.env.example` sets the private upstream URL; it is not a `NEXT_PUBLIC_` variable and never exposes credentials. Next.js rewrites are compiled during `next build`, so set `API_INTERNAL_URL` for the deployment network **at build time**. `APP_URL` and `FRONTEND_URL` must be the public HTTPS origin so queued verification signatures match incoming requests.

Set `APP_ENV=production`, `APP_DEBUG=false`, a persistent unique `APP_KEY`, `SESSION_SECURE_COOKIE=true`, strict first-party `SANCTUM_STATEFUL_DOMAINS`, and the actual trusted proxy CIDRs/addresses. Configure the proxy to forward the original host, port and protocol, and strip untrusted incoming forwarding headers. Never trust arbitrary internet proxies. Preserve `strict-origin` referrers for Sanctum GET authentication. Bind public ingress only to the intended web service; keep FPM, Redis and PostgreSQL private.

Compose and its Dockerfiles are a development environment with bind mounts and development dependencies. For deployment, build immutable images with `composer install --no-dev --optimize-autoloader` and `npm ci && npm run build`; run `next start`. Run FPM and workers under a supervisor/orchestrator; configure PHP OPcache, writable `storage`/`bootstrap/cache` ownership and request/body/time limits. Use a real SMTP provider; Mailpit is a development mailbox.

## Release sequence

1. Back up PostgreSQL, test restoring it, and review migration compatibility.
2. Install locked dependencies/build the frontend with the correct upstream URL.
3. Run `php artisan migrate --force` once per release.
4. Run `php artisan config:cache`, `route:cache` and `view:cache` after setting production environment values.
5. Restart FPM/Next.js and `php artisan queue:restart` so long-running workers load new code.
6. Check `/up` on the internal API and exercise login, verification, switching and one permitted/rejected tenant operation through ingress.

Do not generate a new APP_KEY on each deployment. Rotating it invalidates encrypted sessions and other encrypted data; plan a deliberate rotation if required. Do not run demo seeders in production (they reject that environment).

## Queues and data

Run `queue:work --tries=3 --timeout=60`; the Redis retry-after is 90 seconds, longer than the worker timeout. Notifications dispatch after commits. Supervise workers with automatic restart. Monitor queue depth, failed jobs (`php artisan queue:failed`), mail failures and database errors; retry appropriate failures with `queue:retry`. A queued invitation can later be revoked; delivery of an old email never restores a revoked token. Expired records stay visible for review/resend; schedule data retention appropriate to your organization before the dataset grows materially.

Redis stores encrypted sessions and may store queued links containing secrets; require private networking/authentication and persistent/reliable queue storage. PostgreSQL is the source of truth. Use separate least-privilege application/migration database roles, TLS, encrypted backups and managed secrets in production. The development database role has broader rights for migrations and test setup. Audit events are append-only through application APIs; database access can still change them. Export audit records to a restricted external store if stronger tamper resistance is needed.

v0.1 has no file uploads or live external integrations. Before adding future tenant modules, follow the isolation/permission/test rules in the architecture document. Scaling can begin by adding stateless API/frontend instances sharing Redis/PostgreSQL; measure organization-lock contention and query performance before splitting services.
