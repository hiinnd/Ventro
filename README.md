# VENTRO

**Every Event. Beyond the Moment.**

Production-oriented event management SaaS for Jordan and MENA. Phase 1 provides the technical foundation only.

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

The foundation page supports Arabic/English, RTL/LTR, system/light/dark themes, and real dependency status. No authentication or event management is enabled yet.

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
