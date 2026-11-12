# VENTRO

**Every Event. Beyond the Moment.**

Production-oriented event management SaaS for Jordan and MENA. The repository includes the technical foundation, brand/design system, and bilingual public marketing website. Authentication and event business features are not implemented.

## Requirements

- Node.js 24 LTS (see `.nvmrc`).
- pnpm 10.34.9: `npm install --global pnpm@10.34.9`.
- Docker Desktop / Docker Engine with Docker Compose v2 or newer, running Linux containers.
- Free local ports 3000, 4000, 5432, and 6379.

## Start development

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm env:init
pnpm infra:up
pnpm db:generate
pnpm dev
```

`env:init` preserves an existing `.env`. The API, Prisma CLI, and Next.js load this root file. Restart applications after changing it. Credentials in the template are for local development only.

- Frontend: http://127.0.0.1:3000
- Backend readiness: http://127.0.0.1:4000/api/health
- Backend liveness: http://127.0.0.1:4000/api/health/live
- Swagger UI: http://127.0.0.1:4000/api/docs
- OpenAPI: http://127.0.0.1:4000/api/openapi.json
- Frontend health proxy: http://127.0.0.1:3000/api/health

The public website starts at `/en` or `/ar`; `/` redirects to `/en`. The original foundation and real dependency-status page is preserved at `/dev/foundation` during development. Both development pages return 404 in production. No authentication or event management is enabled yet.

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

`pnpm test:ui` covers all 18 localized pages, links, metadata, browser interactions, language/theme persistence, desktop/mobile axe scans, and the design-system regression suite. With a **production frontend** running, use `pnpm --filter @ventro/web audit:lighthouse` for English mobile/desktop and Arabic mobile reports in ignored `.local/lighthouse`. The script uses installed Chrome (or `CHROME_PATH`); configure `LIGHTHOUSE_URL` for another local origin. Review local results in PROJECT_STATE; default noindex intentionally affects the SEO score.

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

Unit/HTTP tests use explicitly identified dependency doubles. `test:integration` requires actual PostgreSQL and Redis; it never substitutes fake storage. With both applications running, `pnpm test:smoke` verifies the live API, real readiness, CORS, OpenAPI, and the frontend connection. `pnpm check` runs formatting, lint, typecheck, unit tests, and builds together.

For production-mode local verification, after `pnpm build`, start each application in a separate terminal:

```sh
pnpm --filter @ventro/api start
pnpm --filter @ventro/web start
```

These commands test production artifacts; the root `.env` still controls development CORS and Swagger. A real production environment needs separately managed credentials, HTTPS origins, networking, and deployment configuration.

## Workspace

| Path              | Responsibility                                                  |
| ----------------- | --------------------------------------------------------------- |
| `apps/web`        | Next.js App Router, frontend health proxy, localized foundation |
| `apps/api`        | NestJS HTTP application, health, Prisma, Redis                  |
| `packages/ui`     | Shared tokens and shadcn-compatible components                  |
| `packages/types`  | Runtime-validated API contracts and shared types                |
| `packages/config` | Strict TypeScript, ESLint, Prettier                             |
| `infrastructure`  | Local PostgreSQL and Redis Compose services                     |
| `docs`            | Architecture, project state, roadmap                            |

## Environment and security

See `.env.example` for every required variable. Never commit `.env`, database data, or credentials.

- `API_INTERNAL_URL` is server-only and must be an HTTP(S) origin without credentials or paths. The browser calls a fixed same-origin proxy; no secret is sent to client bundles.
- `WEB_ORIGINS` is a comma-separated exact allowlist, with no wildcard, paths, or trailing slash. Production requires HTTPS. CORS is a browser policy; authorization will be introduced before business data.
- `API_HOST=127.0.0.1` binds the backend locally. Set an appropriate interface explicitly when deploying.
- `SWAGGER_ENABLED=true` is for development. Set it to `false` in production unless API documentation access is deliberately managed.
- Compose binds database ports to loopback, requires a Redis password, and persists both services in named volumes.
- The database URL credentials and port must match the PostgreSQL variables. The Redis URL must match its password and host port. URL-encode special characters in passwords.

## Database lifecycle

Phase 1 intentionally has **no domain tables or migrations**. The Prisma client is generated for real SQL connectivity. When the first approved domain model is added, create and review a migration with `pnpm db:migrate --name <name>`. Use `pnpm db:deploy` for reviewed migrations in CI/deployment; never use development migrations against production.

`pnpm infra:down` stops services and preserves named data volumes. `pnpm infra:logs` shows recent service logs. Deleting volumes is a separate destructive operation.

## CI and status

GitHub Actions runs independent lint, typecheck, unit test, and build jobs, plus a Compose-backed integration and smoke job. Local results and limitations are recorded in [PROJECT_STATE](docs/PROJECT_STATE.md). Architectural decisions are in [ARCHITECTURE](docs/ARCHITECTURE.md); future work is in [ROADMAP](docs/ROADMAP.md).

If Docker is missing or not running, `pnpm infra:up` cannot start dependencies. Install/start Docker with Linux containers before using the documented standard workflow.
