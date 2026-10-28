# Project conventions

Build the Laravel/Next.js modular monolith described in README.md. Production runtime targets PHP 8.4, Laravel 13, PostgreSQL 18, Redis, Next.js 16 and Tailwind CSS 4. Keep business rules, validation, tenant authorization and audit writes in Laravel. Keep UI state and rendering in Next.js.

Read docs/architecture.md before changing tenancy or authorization. Every tenant route must resolve an explicit OrganizationContext; fetch children through scoped relationships. Tenant mutations recheck permissions inside the organization transaction lock. Add adversarial cross-tenant tests for new endpoints. Never use a global/static tenant context or treat a session selection as authorization.

Use the existing feature components and shadcn/ui primitives. Do not implement future operational modules as part of the foundation. Run relevant PHPUnit tests, frontend lint/typecheck/build and affected browser flows. Use a dedicated PostgreSQL test database. Never seed demo accounts in production.
