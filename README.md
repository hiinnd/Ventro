# VENTRO

**Every Event. Beyond the Moment.**

Production-oriented event management SaaS for Jordan and MENA. The repository includes the technical foundation, brand/design system, bilingual public website, and secure personal-account authentication. Event business features and organization management UI remain outside the current phase.

## Requirements

- Node.js 24 LTS (see `.nvmrc`).
- pnpm 10.34.9: `npm install --global pnpm@10.34.9`.
- Docker Desktop / Docker Engine with Docker Compose v2 or newer, running Linux containers.
- Free local ports 3000, 4000, 5432, 6379, 1025, and 8025.

## Start development

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm env:init
pnpm infra:up
pnpm db:generate
pnpm db:deploy
pnpm dev
```

`env:init` preserves existing settings and provisions a private random `AUTH_SECRET` when missing in local development. The API, Prisma CLI, and Next.js load this root file. Restart applications after changing it. Credentials in the template are for local development only. Production must supply a managed secret explicitly.

- Frontend: http://127.0.0.1:3000
- Backend readiness: http://127.0.0.1:4000/api/health
- Backend liveness: http://127.0.0.1:4000/api/health/live
- Swagger UI: http://127.0.0.1:4000/api/docs
- OpenAPI: http://127.0.0.1:4000/api/openapi.json
- Frontend health proxy: http://127.0.0.1:3000/api/health
- Local email inbox: http://127.0.0.1:8025 (Mailpit SMTP on 127.0.0.1:1025).

The public website starts at `/en` or `/ar`; `/` redirects to `/en`. The original foundation and real dependency-status page is preserved at `/dev/foundation` during development. Both development pages return 404 in production.

## Accounts and authentication

Open `/en/register`, `/en/login`, `/en/forgot-password`, `/en/reset-password`, `/en/verify-email`, or protected `/en/account`; corresponding `/ar/*` pages are fully localized. Forms use real versioned NestJS endpoints through an allowlisted same-origin Next.js proxy. Check Mailpit to open verification and recovery links. Tokens are carried in URL fragments, removed by the page, and consumed only after an explicit action.

Registration creates a user and a durable encrypted verification-email delivery. It does not automatically sign in or create an organization. Unverified users may sign in to their own account/profile and resend verification; a reusable server-side verified-email guard is provided for later business endpoints. Login sets an opaque HTTP-only cookie. Sessions expire after seven days of inactivity, renew by rotating their secret, and have a thirty-day absolute limit. Reset links expire in thirty minutes, verification links in twenty-four hours, and both are single use. Resetting revokes all existing sessions and sends a security notice. A profile exposes name, read-only email, verification state, and email-language preference.

For optional local seed data:

```sh
pnpm env:init --seed
pnpm db:seed
```

This generates missing development credentials in ignored `.env` without printing them, then creates an idempotent `.test` account, a development organization, OWNER membership, and a seed audit record. Read the private `.env` locally to use those credentials. Seed execution refuses production/nonlocal databases, never overwrites an existing password/profile, and never promotes an existing membership. No provider `Account` model is needed for password-only authentication; future OAuth requires its own approved model/migration.

`AUTH_APP_URL` must exactly match a `WEB_ORIGINS` entry. `AUTH_SECRET` is a private 32-byte hex secret used for encrypted email delivery and pseudonymous rate/audit keys. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, optional credentials, and TLS settings using `.env.example`. Production requires HTTPS, TLS SMTP, a sender outside `.test`, and uses `__Host-ventro_session` with Secure/HttpOnly/SameSite=Lax and no Domain. Local HTTP development uses `ventro_session`; do not treat that development setting as a production deployment. CORS remains exact and does not enable cross-origin cookie sharing.

SMTP outages retain encrypted delivery intent in PostgreSQL and retry automatically. The built-in worker uses short row leases and SKIP LOCKED, sends at most one delivery per two-second tick per API process, and provides at-least-once delivery rather than claiming exactly-once email. Mailpit is local development tooling, not production email infrastructure. See [AUTHENTICATION](docs/AUTHENTICATION.md) for endpoints, security boundaries, deployment requirements, limits, retention, and tests.

## Organizations and team access

Verified accounts can create and join multiple organizations at `/en/organizations` or `/ar/organizations`. Account Profile links into this workspace. Owners manage organization profiles, private logos, invitations and team roles. Event Managers may read the team directory; Check-in Staff and Participants may read only their organization profile. All access is enforced again by the backend, regardless of the active workspace or visible navigation.

Invitations are delivered through the real encrypted SMTP outbox, expire after seven days, and can be accepted or declined only by the verified invited address. Reissuing replaces the old link. A removed member immediately loses API access and their active selection is cleared. Concurrent role changes cannot remove the last active owner.

Platform Admin is a separate global permission with a limited read-only organization directory. It grants no implicit tenant access and cannot be assigned through a team invitation. For an existing verified **local development** account, the trusted operator can run `pnpm platform:admin --grant <email>` or `--revoke <email>`. No default administrator is created; the tool refuses production/nonlocal databases.

Organization settings and team pages live under `/{locale}/organizations/:id/settings` and `/team`; received invitations are at `/{locale}/invitations`. Logos accept static PNG/JPEG/WebP up to 2 MiB, are sanitized and stored persistently in PostgreSQL, and require membership to view. See [ORGANIZATIONS](docs/ORGANIZATIONS.md) for the complete role matrix, endpoint/locking/invitation policies, limits, migration mapping and operational requirements.

## Public website

Home, Features, Solutions, Pricing, About, Contact, FAQ, Privacy Policy, and Terms of Service are available in both languages, with URL-based server-rendered language/direction, light/dark themes, responsive photography, and reduced-motion support. Product screens, Event Passport, and the filtered event gallery are explicitly illustrative concepts.

No prices are approved: Gather/Grow/Scale are proposed packages and show “Announced at launch.” The contact page prepares a brief in browser memory, validates it locally, and supports real clipboard copying. It does not submit contact data or enroll users. Setting `CONTACT_EMAIL` enables a user-controlled email draft; delivery is handled by the user's email app.

Before public launch, configure these root `.env` values and restart/rebuild:

| Variable                  | Default / purpose                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `SITE_URL`                | `http://127.0.0.1:3000`; approved origin for canonical, alternate, sitemap, and Open Graph URLs. No path or credentials.                         |
| `SEARCH_INDEXING_ENABLED` | `false`; indexing requires an explicit `true` **and** an HTTPS `SITE_URL`. Local/staging previews intentionally use noindex and robots disallow. |
| `CONTACT_EMAIL`           | Empty; do not invent a contact address. Enables email-draft links when set.                                                                      |
| `LEGAL_OPERATOR_NAME`     | Empty; display confirmed operator details when supplied. Legal documents remain clearly marked preview drafts pending legal approval.            |

Only the VENTRO brand name has been provided; an official domain, contact email, registered operator, and approved prices remain launch dependencies. No live waitlist, analytics, or contact backend is installed. Photography sources and licensing are documented in [ASSET_LICENSES](docs/ASSET_LICENSES.md). `node scripts/fetch-marketing-assets.mjs` regenerates the committed local WebP images and provenance manifest; normal builds need no photo download.

`pnpm test:ui` covers public pages and real authentication flows, browser interactions, language/theme persistence, desktop/mobile axe scans, and the design-system regression suite. Run `pnpm infra:up` and `pnpm db:deploy` first; it builds and starts/reuses the API and development frontend automatically. Auth browser tests refuse production/nonlocal services and remove only their own uniquely named `.test` fixtures. With a **production frontend** running, use `pnpm --filter @ventro/web audit:lighthouse` for English mobile/desktop and Arabic mobile reports in ignored `.local/lighthouse`. The script uses installed Chrome (or `CHROME_PATH`); configure `LIGHTHOUSE_URL` for another local origin. Review local results in PROJECT_STATE; default noindex intentionally affects the SEO score.

## Brand and design system

During development, open http://127.0.0.1:3000/dev/design-system for the original SVG identity, local fonts, tokens, and interactive component library. The route returns 404 in production. SVG downloads are available under `apps/web/public/brand`.

`pnpm brand:generate` regenerates the eight SVG assets from shared geometry. `pnpm brand:check` checks consistency. `pnpm test:ui` runs Playwright keyboard, RTL/theme, responsive, and axe accessibility checks; it starts the development frontend automatically. See [DESIGN_SYSTEM](docs/DESIGN_SYSTEM.md) for component APIs and browser setup.

Readiness returns **200** only when Prisma can query PostgreSQL and authenticated Redis responds to PING. Dependency failures return **503** with individual statuses. The frontend proxy returns **502** when the API is unreachable or its response is invalid. Liveness stays available during dependency outages.

## Verify

```sh
pnpm db:validate
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
```

Unit/HTTP tests use explicitly identified dependency doubles. `test:integration` requires actual PostgreSQL, Redis and SMTP/Mailpit; it never substitutes fake storage. With both applications running, `pnpm test:smoke` verifies the live API, real readiness, CORS, OpenAPI, and the frontend connection. `pnpm check` runs formatting, lint, typecheck, unit tests, and builds together.

For production-mode local verification, after `pnpm build`, start each application in a separate terminal:

```sh
pnpm --filter @ventro/api start
pnpm --filter @ventro/web start
```

These commands test production artifacts; the root `.env` still controls development CORS and Swagger. A real production environment needs separately managed credentials, HTTPS origins, networking, and deployment configuration.

## Workspace

| Path              | Responsibility                                                        |
| ----------------- | --------------------------------------------------------------------- |
| `apps/web`        | Next.js public site, localized account pages, same-origin API proxies |
| `apps/api`        | NestJS health, authentication, Prisma, Redis, SMTP outbox             |
| `packages/ui`     | Shared tokens and shadcn-compatible components                        |
| `packages/types`  | Runtime-validated API contracts and shared types                      |
| `packages/config` | Strict TypeScript, ESLint, Prettier                                   |
| `infrastructure`  | Local PostgreSQL, Redis, and Mailpit Compose services                 |
| `docs`            | Architecture, project state, roadmap                                  |

## Environment and security

See `.env.example` for every required variable. Never commit `.env`, database data, or credentials.

- `API_INTERNAL_URL` is server-only and must be an HTTP(S) origin without credentials or paths. The browser calls a fixed same-origin proxy; no secret is sent to client bundles.
- `WEB_ORIGINS` is a comma-separated exact allowlist, with no wildcard, paths, or trailing slash. Production requires HTTPS. CORS is a browser policy; session and tenant authorization must also protect future business endpoints.
- `API_HOST=127.0.0.1` binds the backend locally. Set an appropriate interface explicitly when deploying.
- `SWAGGER_ENABLED=true` is for development. Set it to `false` in production unless API documentation access is deliberately managed.
- Compose binds database and Mailpit ports to loopback, requires a Redis password, and persists PostgreSQL, Redis, and the local mailbox in named volumes.
- The database URL credentials and port must match the PostgreSQL variables. The Redis URL must match its password and host port. URL-encode special characters in passwords.

## Database lifecycle

The initial Phase 4 migration creates users, sessions, email/reset tokens, organizations/memberships, audit logs, and an encrypted email outbox, with constraints, indexes, and foreign keys. Prisma connections explicitly use UTC PostgreSQL sessions. Use `pnpm db:deploy` for the committed migration. Future schema changes require a reviewed `pnpm db:migrate --name <name>` migration; never run development migrations or seed commands against production.

`pnpm infra:down` stops services and preserves named data volumes. `pnpm infra:logs` shows recent service logs. Deleting volumes is a separate destructive operation.

## CI and status

GitHub Actions runs independent lint, typecheck, unit test, and build jobs, plus a Compose-backed integration and smoke job. Local results and limitations are recorded in [PROJECT_STATE](docs/PROJECT_STATE.md). Architectural decisions are in [ARCHITECTURE](docs/ARCHITECTURE.md); future work is in [ROADMAP](docs/ROADMAP.md).

If Docker is missing or not running, `pnpm infra:up` cannot start dependencies. Install/start Docker with Linux containers before using the documented standard workflow.
