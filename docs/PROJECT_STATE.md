# Project state

## Phase 14 — optional AI assistant (2026-11-14)

Implementation added alongside the existing incomplete phases; this does not mark
Phases 11–13 complete or remove their remaining gates.

- Five organizer drafting tools in the Events workspace, English/Arabic labels,
  disabled/loading/failure states, editable AI-labeled output and explicit review
  before copying. No automatic publication or participant-data reads.
- Server-only Anthropic adapter behind AiProvider, environment enablement, strict
  input/consent validation, live tenant authorization, Redis daily organization
  quota and safe timeout/error handling.
- Modified: API ai module, app module, environment config and tests; web assistant,
  dashboard shell and organization proxy; .env.example and AI_ASSISTANT.md.
- Database changes: none. Redis stores expiring usage counters; no prompt storage.
- Verification: focused provider/security tests passed (5). Live-provider execution
  is pending an operator-supplied model/key. See AI_ASSISTANT.md for test boundaries.
- Executed successfully: API build and test typecheck; web typecheck and production
  build; workspace lint; git diff --check. The targeted PostgreSQL HTTP integration
  test passed (1): unauthenticated/foreign-tenant rejection, disabled status and
  invalid-input rejection.
- Known limits: manual anonymization required; heuristics cannot identify every
  personal detail. Copy approval is a draft workflow, not an event publication.
  Review provider terms and verify real generation before production enablement.

Phase 14 commands (local pnpm invoked via npm exec --prefix .tools):

- pnpm --filter @ventro/api typecheck: passed (includes Nest build).
- pnpm --filter @ventro/web typecheck and build: passed.
- pnpm lint: passed.
- pnpm --filter @ventro/api exec vitest run --config vitest.config.mts test/ai.test.ts: 5 passed.
- pnpm --filter @ventro/api exec vitest run --config vitest.integration.config.mts test/registrations.integration.ts -t "protects optional AI": 1 passed, other scenarios skipped by filter.
- pnpm --filter @ventro/web test: 15 passed.
- git diff --check: passed.
- pnpm --filter @ventro/web exec playwright test engagement.spec.ts -g "optional AI":
  final run 1 passed (55.2 seconds). Covers actual disabled UI and mocked-generation
  consent/review/reset behavior. Initial attempts found a fixture PostgreSQL timeout
  and an overly strict label locator; the final run passed after correcting the
  locator. No live-provider result is claimed.

> Latest Phase 10 verification (2026-11-14, Asia/Amman) supersedes the earlier working note below: migration `20261114093000_live_engagement` is applied to the local development PostgreSQL database. Focused integration coverage passed for persisted polling/Q&A, duplicate/closed/unauthorized actions, live Socket.IO broadcast to two authorized clients, and rejection of an unauthorized event-room connection. The focused Playwright flow passed for the authenticated participant live room, organizer engagement workspace, and presenter results view.

> Phase 7 working update — event records/categories/speakers/sessions/media have a locally applied Prisma migration, tenant-scoped transactional commands, bounded cover storage, public reads, and a connected multi-step builder for essentials, schedule, speakers, agenda, cover uploads, review, draft save, publish, duplicate, unpublish and cancellation. An isolated PostgreSQL integration suite verifies invalid schedules, public discovery, private protection, duplication, state transitions and cross-tenant authorization. Browser verification remains before marking the phase complete.

> Phase 8 working update — a locally applied migration adds registration forms, fields, registrations, and answers. Server-side schema/submission validation, tenant-scoped organizer APIs, duplicate prevention and capacity locking are implemented. The organizer registration workspace exposes form building, publishing, field ordering/conditional visibility, search/filter and CSV export; public registration, confirmation, and My Registrations views are connected. A real isolated-PostgreSQL integration suite now verifies persisted responses, duplicate prevention, tenant authorization, registration deadlines, private-event protection, and concurrent capacity enforcement. Broader browser regression remains required before this phase can be marked verified.

Updated: 2026-11-14 (Asia/Amman).

> Phase 10 working update — persistent Poll/PollOption/PollVote/Question/QuestionVote models and a Socket.IO gateway are implemented. WebSocket handshake enforces the allowed web origin and a valid HTTP-only session; joining an event room additionally requires membership or confirmed registration. Poll votes lock the poll inside a transaction to prevent concurrent duplicate votes, and unique question-vote constraints prevent duplicate upvotes. REST and Socket.IO actions validate state/room access server-side, while organizer and participant live-room UIs are connected. The new migration has not yet been deployed to the local development database and multi-client browser/WebSocket verification remains outstanding.

> Phase 9 working update — a locally applied ticketing migration adds opaque UUID credentials, SHA-256 secret hashes, revocation support, event check-ins and session attendance. A ticket is created atomically with a successful registration. Authenticated staff/organizers scan only opaque credentials; tenant/event ownership, ticket activity, and duplicate attendance are enforced on the server and audited. Participant ticket presentation now renders a real QR code with no personal data and supports printing; the authorized attendee dashboard has event metrics, recent scans, manual credential input, and camera scanning where the browser supports BarcodeDetector. The isolated PostgreSQL integration suite covers ticket issue, invalid/revoked/duplicate scans, unauthorized scans, and statistics. Browser/device verification remains outstanding.

## Current milestone

Phases 1–5 are implemented and verified within their stated scope. Phase 6 organizer dashboard is authorized and in progress. The existing repository was clean at the start of this phase. Tenant-aware read models for real organization metrics/activity/search/notices are implemented; backend verification and the responsive localized shell are underway. Event business logic remains outside this phase. No deployment has been started.

## Completed implementation

Phase 1 foundation is preserved: workspace, strict shared configuration, Compose definitions, Prisma/Redis connections, NestJS health and HTTP infrastructure, and the localized health page.

Phase 2 delivers:

- Eight original geometric SVG assets: horizontal and symbol lockups for light/dark surfaces, monochrome horizontal variants, favicon, and app icon. A shared geometry source drives React and generated assets.
- Locally bundled Plus Jakarta Sans, Inter, and IBM Plex Sans Arabic; semantic light/dark tokens for colors, spacing, typography, radii, elevation, motion, focus, and accessible control boundaries.
- Buttons, inputs, textarea, selects, checkboxes, radios, cards, badges, tables, modals, dialogs, confirmations, dropdowns, tabs, tooltips, toasts, skeletons, empty/error states, pagination, breadcrumbs, sidebar, navigation, and form wrappers.
- Global language/direction preference, Radix RTL behavior including portals, themes, and reduced-motion policy. Health-page behavior remains connected to the backend.
- Development-only `/dev/design-system`, SVG generation/consistency commands, Playwright/axe tests, and a UI CI job. Production smoke checks require the showcase to return 404.

## Verification

Phase 2 results: `pnpm check` passed brand consistency, formatting, lint, strict typechecks, 30 unit/HTTP/contract tests, and both builds. After adding the pre-render development-route guard, lint, web typecheck, and web build passed again. `pnpm test:ui` passed all 8 browser tests with desktop/mobile axe scans in both languages/themes; 3 targeted Arabic/RTL tests passed after the guard update. The real dependency integration test passed against portable PostgreSQL and authenticated Redis.

Production smoke passed readiness, CORS, request IDs, OpenAPI, the frontend proxy, favicon/app manifest/icon, and real 404 responses for the development showcase. Base, query-string, and child showcase paths returned 404 with no-store. The documented `pnpm dev` command started both applications and served the development showcase and real frontend health connection; its initial Windows watch compilation exceeded the first 90-second probe, then the readiness checks passed after compilation completed. Compose configuration and `git diff --check` passed. No API source changes were introduced.

Resolved during validation: React StrictMode initially overwrote saved Arabic preference before loading completed; persistence now waits for preference loading. Motion's tap wrapper initially introduced a redundant focus stop/hydration difference under reduced motion; an explicit negative tab index keeps focus on the native button. Pagination creates a bounded page window even for large totals. Menus and selects have visible keyboard highlight rings.

## Database changes

None in Phase 2. No domain tables, migrations, seed records, or API changes. Generated Prisma artifacts remain ignored.

## Modified files

- `packages/ui/src/*`: original geometry/logo, semantic tokens, all shared components and exports; `packages/ui/package.json`.
- `apps/web/public/brand/*.svg`: eight vector deliverables.
- `apps/web/src/app/globals.css`, `layout.tsx`, `manifest.ts`, `dev/design-system/page.tsx`, `apps/web/src/proxy.ts`.
- `apps/web/src/components/locale-provider.tsx`, `providers.tsx`, `foundation.tsx`, `design-system/showcase.tsx`.
- Root/web manifests and lockfile; `scripts/generate-brand.mjs`, `scripts/smoke.mjs`, `scripts/wait-for.mjs`.
- `apps/web/playwright.config.ts`, `apps/web/test/ui/design-system.spec.ts`, `.github/workflows/ci.yml`.
- `.gitattributes`, ignore rules, README, ARCHITECTURE, ROADMAP, DESIGN_SYSTEM, PROJECT_STATE.
- `apps/web/AGENTS.md` was generated by installed Next.js during development and retained as instructed by that framework.

## Known issues and next phase dependencies

No remaining Phase 2 implementation blockers. Docker Desktop/Engine and WSL are absent on this host. Compose configuration is validated, but Docker-backed startup cannot be verified here; real PostgreSQL/Redis runtime checks use ignored portable instances. GitHub Actions definitions are authored but remote execution has not been claimed. Automated accessibility coverage uses Chrome/Chromium; broader device and assistive-technology review remains future work.

The user authorized restoring missing tracked Phase 1 files from HEAD after a local folder move. Stale module links were archived under ignored `.local` and rebuilt; API logic was preserved.

Future phases require an explicit prompt, completion of this phase's verification, and an approved tenant/user/authorization model before any business data endpoint. Production hosting, CI remote status, backup/restore, and broader device/manual assistive-technology testing remain separate work.

## Phase 3 implementation

- Nine complete public pages, each under `/en` and `/ar`: Home, Features, Solutions, Pricing, About, Contact, FAQ, Privacy Policy, Terms of Service. Root redirects to `/en`; unknown public slugs return a real 404.
- Premium responsive sticky navigation, mobile focus-trapped navigation, theme and URL language switching, local typography, original brand assets, licensed local event atmosphere photography, and a professional complete footer.
- Homepage narrative includes the exact English tagline, two meaningful CTAs, an interactive organizer-workspace concept, problem/solution, interactive features, five-stage lifecycle, organizer/participant benefits, decorative Event Passport, proposed pricing, FAQ, and final CTA. There are no fabricated customer metrics, endorsements, logos, or testimonials.
- All event cards, product screens, credentials, and unimplemented capabilities are labeled concepts/previews. The gallery supports real local filtering and accessible preview dialogs. No event is created, booked, registered, measured, or persisted.
- Pricing has no approved amounts. Gather/Grow/Scale are explicitly proposed packages with prices “Announced at launch.” No purchase or subscription control is implied.
- Contact validates and prepares an actual brief in page memory, supports real clipboard copying with a selected-text fallback, and optionally opens an email draft when an official address is configured. It never claims delivery, enrollment, or server persistence. FAQ search supports results, details, and empty-state recovery.
- Server-rendered HTML language/direction, localized metadata, canonical and language alternatives, Open Graph/Twitter metadata, original `/og` PNG, eighteen-page sitemap, robots, semantic headings/landmarks, focus states, and reduced-motion behavior.
- Motion mini handles scroll-triggered reveals; LazyMotion limits hero features; preview transitions start on tab changes. Text stays fully opaque during animation. The hero uses high-priority eager optimized imagery without waiting for client blur removal. Content remains visible before animation JavaScript executes.
- The original health foundation is preserved at `/dev/foundation`; it and `/dev/design-system` return 404 in production. Backend/API source and behavior are unchanged.

### Phase 3 modified files

- `apps/web/src/app/[locale]/[[...slug]]/page.tsx`, root page/layout/globals, `marketing.css`, `dev/foundation/page.tsx`, `og/route.tsx`, `sitemap.ts`, `robots.ts`, and Proxy.
- `apps/web/src/components/marketing/*`: shell, home, public pages, shared sections, icons, motion, previews, FAQ search, and contact brief; `providers.tsx` and `locale-provider.tsx` accept the server locale.
- `apps/web/src/lib/marketing/*`: route validation, bilingual content, and validated deployment configuration.
- `apps/web/public/media/*`, `scripts/fetch-marketing-assets.mjs`, `docs/ASSET_LICENSES.md`, and three unmodified font copyright/license notices in `docs/licenses/`.
- `apps/web/scripts/lighthouse.mjs`, `apps/web/test/ui/marketing.spec.ts`, Playwright configuration, web manifest/lockfile, `next.config.ts`, `scripts/smoke.mjs`, and CI browser-job labels.
- `packages/ui/package.json` exposes existing brand geometry directly for the Open Graph route. `.env.example`, README, ARCHITECTURE, ROADMAP, DESIGN_SYSTEM, and PROJECT_STATE document behavior and launch inputs.

### Phase 3 database changes

None. No models, migrations, seed business data, tenant endpoints, contact storage, or backend changes.

### Phase 3 commands and results

Windows runs use `npm.cmd exec --prefix .tools -- pnpm …` to invoke the local pnpm installation; documented standard commands use `pnpm`.

| Command / check                                                                          | Observed result                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/fetch-marketing-assets.mjs`                                                | Downloaded the two licensed sources, generated local WebP images/blur metadata/hashes; images visually inspected.                                                                                                                                                                                                                                                            |
| `pnpm check`                                                                             | Passed SVG consistency, format, lint, strict workspace typechecks, 20 API + 10 web tests, and both production builds.                                                                                                                                                                                                                                                        |
| `pnpm test:ui`                                                                           | Eight design-system regression scenarios passed. The first combined marketing run exposed a transient contrast issue during opacity animation and an overly broad test locator; both were corrected. All marketing scenarios subsequently passed in production mode.                                                                                                         |
| `pnpm --filter @ventro/web test:ui marketing.spec.ts` with `PLAYWRIGHT_PRODUCTION=1`     | **10 passed on the final production build**: eighteen localized pages and links/anchors, server language/direction, metadata/OG/sitemap, four theme/language combinations, desktop/mobile axe scans, images, keyboard previews, real dialogs, mobile navigation, local contact validation/clipboard/no writes, FAQ recovery, reduced motion. No browser console/page errors. |
| `pnpm test:integration`                                                                  | **1 passed** using real portable PostgreSQL 17 and authenticated Redis 7.4.                                                                                                                                                                                                                                                                                                  |
| `pnpm --filter @ventro/api start`, `pnpm --filter @ventro/web start`                     | Both started successfully; real readiness returned 200.                                                                                                                                                                                                                                                                                                                      |
| `pnpm test:smoke`                                                                        | Passed real readiness, frontend-to-backend proxy, CORS, request IDs, OpenAPI, all eighteen public pages, metadata, OG PNG, sitemap, manifest/icons, invalid public slug 404, and both development-route production guards. Fixed the smoke script to resolve a valid relative redirect Location against the origin.                                                          |
| `pnpm --filter @ventro/web audit:lighthouse`                                             | Completed English mobile/desktop and Arabic mobile audits on production; results below.                                                                                                                                                                                                                                                                                      |
| Final `pnpm lint`, web `typecheck`, web `build`, `pnpm format:check`, `git diff --check` | Passed after the performance/animation changes. Full API source diff remains empty.                                                                                                                                                                                                                                                                                          |

Local visual review covered English/Arabic, both themes, mobile/desktop heroes, product preview, pricing, Arabic contact, concept gallery, and the generated Open Graph image. Captures live under ignored `.local/screenshots`; Lighthouse HTML/JSON reports and `summary.json` live under ignored `.local/lighthouse`, with the initial baseline retained in `baseline/`.

| Final Lighthouse target | Performance | Accessibility | Best practices | SEO | LCP   | TBT      | CLS   |
| ----------------------- | ----------- | ------------- | -------------- | --- | ----- | -------- | ----- |
| English mobile          | 68          | 100           | 100            | 69  | 3.4 s | 1,100 ms | 0     |
| English desktop         | 97          | 100           | 100            | 69  | 0.7 s | 140 ms   | 0.001 |
| Arabic mobile           | 71          | 100           | 100            | 69  | 3.7 s | 740 ms   | 0     |

Lighthouse 13.6 uses installed local Chrome, a production Next.js server, default simulated mobile throttling, and an explicitly configured desktop profile. These are single-run local lab measurements, not field Core Web Vitals or a universal accessibility certification. Initial English mobile was 59 with 4.1 s LCP and 1,890 ms TBT. Optimized image delivery and lighter Motion handling were implemented and rechecked; scores varied across runs. The final recorded run is reported above without selecting the best intermediate score. An experimental package-import optimization produced no bundle reduction and was removed.

Mobile JavaScript/hydration cost remains a performance limitation. Lighthouse also identifies unused framework/client JavaScript, image-delivery opportunities, and dynamic-page back/forward-cache restrictions. No claim of a 90+ mobile score is made. SEO's failing indexing audit is intentional: noindex/robots disallow stay enabled until an approved HTTPS domain and launch policy exist.

### Phase 3 known issues and launch dependencies

Only the VENTRO brand name is supplied. The official domain, contact email, registered legal operator, and approved prices are unconfirmed. Configure `SITE_URL`, `CONTACT_EMAIL`, and `LEGAL_OPERATOR_NAME` before launch; legal documents remain explicitly marked draft and require approval. `SEARCH_INDEXING_ENABLED=false` intentionally prevents local/staging indexing; enabling it additionally requires HTTPS. No contact backend or mailing list is installed, and the page explains its actual local behavior.

Docker remains unavailable on this Windows host; real database/Redis checks use the previously initialized ignored portable services. CI workflows are authored but remote GitHub execution is not claimed. Browser/accessibility checks use local Chrome; wider browser/device/manual assistive-technology review remains a release consideration. No deployment or publication was requested.

The local preview/API processes are stopped after verification. Persistent portable database/Redis data and local tooling are retained under ignored directories. Standard infrastructure startup remains the documented Docker Compose workflow on a host with Docker available.

The next implementation phase requires an explicit prompt. Before any account or event business endpoint, approve the tenant/user/access model and implement server-side authorization and cross-tenant isolation tests. Any future real contact submission needs approved delivery/storage, server validation, abuse controls, and final privacy disclosures.

## Phase 4 implementation

Phase 4 is implemented and verified. The descriptions above for earlier phases are historical milestones.

### Completed features

- PostgreSQL/Prisma user, session, email-verification/reset token, organization, organization-member, audit-log, and encrypted-email-outbox models. Password credentials live on User; a provider Account model is not required without OAuth.
- Initial versioned migration with foreign keys, indexes, unique normalized emails, enum roles/statuses, and credential/lifetime constraints; applied to the local development database. Safe idempotent development seed creates an explicit local account/organization/OWNER membership/audit fixture, with generated private credentials and no password overwrite.
- Real `/api/v1/auth` register, login, logout, verification/resend, forgot/reset, session lookup/renewal, and owner-scoped profile read/update endpoints. No organization-management UI or event logic.
- Argon2id 64 MiB/three iterations, bounded password work, opaque hashed sessions/tokens, expiry and absolute lifetime, rotating renewal, versioned credential revocation, transactional audit logs, user-row locking, and concurrent single-use token handling.
- Exact origin/custom-header/JSON CSRF checks, HTTP-only cookies, Secure host-only production cookies, Redis rate counters with safe 429/Retry-After, strict DTOs, bounded bodies, safe parser/errors/logs, disabled-account handling, and explicit tenant membership/role checks for future domain services.
- Real SMTP via local Mailpit. Auth delivery is committed in an AES-GCM encrypted outbox, leased/retried durably, and cleared after delivery/expiry. No raw token is stored in its token table or returned in session JSON. Password reset invalidates all prior sessions and sends a security notice.
- English/Arabic Login, Register, Forgot Password, Reset Password, Verify Email, and protected Account Profile pages. All forms use the real backend through an allowlisted same-origin proxy, with loading/error/success states, theme/RTL support, safe token-fragment handling, and real profile/session actions.
- Public sign-in navigation and corrected product/FAQ/privacy/terms copy. Account routes are noindex; the eighteen-page public sitemap remains intact. Existing public site/design-system/health behavior is preserved.

### Database and modified files

- `apps/api/prisma/schema.prisma`, `prisma.config.ts`, `prisma/migrations/20261112214435_auth_foundation/*`, and `prisma/seed.mjs`.
- `apps/api/src/auth/*`, `src/organizations/organization-access.service.ts`, `src/app.module.ts`, HTTP/environment configuration, exception filter, Prisma UTC pool configuration, and Redis rate-limit primitive.
- API/web manifests, lockfile, `pnpm-workspace.yaml`, root scripts, `.env.example`, `scripts/init-env.mjs`, `packages/config/eslint.mjs`, and `infrastructure/compose.yaml`.
- Six localized auth pages, `apps/web/src/components/auth/*`, `src/app/auth.css`, globals, `src/app/api/auth/[action]/route.ts`, `src/lib/auth/*`, Proxy, public sign-in links, account-aware public copy, and sitemap dates.
- `packages/types/src/index.ts` provides validated safe auth/session projections.
- `apps/api/test/auth-security.test.ts`, `auth.integration.ts`, Node-only browser-fixture cleanup, dependency clock regression, existing HTTP/environment test setup, integration config, web auth-boundary/browser tests, Playwright/CI configuration, and production smoke coverage.
- README, ARCHITECTURE, ROADMAP, DESIGN_SYSTEM, AUTHENTICATION, and PROJECT_STATE.

No production database was accessed. API auth integration uses its own uniquely named database and actual migrations, then drops that owned fixture. Browser tests create uniquely named local `.test` accounts and clean only their own records. Inactive databases left by interrupted native test workers were verified to contain only this suite's matching UUID/email fixtures before removal; the development database was preserved.

### Commands executed and results

Windows verification used `npm.cmd exec --prefix .tools -- pnpm …` for the local pnpm installation. These are observed local results, not remote CI or production-deployment claims.

| Command / check                                                          | Observed result                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`, native Argon2 rebuild                                    | Dependencies installed; real Argon2id hashing/verification exercised successfully.                                                                                                                                                                                                                    |
| `pnpm env:init --seed`                                                   | Existing settings preserved; missing development secrets/seed credentials generated privately in ignored `.env`.                                                                                                                                                                                      |
| `pnpm db:generate`, `pnpm db:validate`, `pnpm db:deploy`                 | Generated the client, validated the schema, and applied `20261112214435_auth_foundation` to local PostgreSQL.                                                                                                                                                                                         |
| `pnpm db:seed`, subsequent `prisma db seed`                              | Created the development fixture; rerun succeeded idempotently without overwriting credentials or profile.                                                                                                                                                                                             |
| Compose `config --quiet`                                                 | Passed using the standalone Compose client. Docker Engine is unavailable; container startup is not claimed.                                                                                                                                                                                           |
| `pnpm check`                                                             | Passed SVG consistency, formatting, lint, strict workspace typechecks, **24 API + 12 web unit/HTTP/contract tests**, and both production builds.                                                                                                                                                      |
| `pnpm test:integration`                                                  | **13 passed** with actual PostgreSQL, Redis, SMTP/Mailpit, and committed migrations in an isolated test database. Includes concurrent token/renewal races, reset revocation, expired/disabled sessions, durable mail retry, rate limits, tenant/role isolation, and clock correctness.                |
| `pnpm --filter @ventro/web test:ui`                                      | **25 passed**: seven auth scenarios, eight design-system regressions, ten public-site regressions. Includes real English account/recovery flow, Arabic mobile email/verification, four language/theme combinations, desktop/mobile axe, forged-session rejection, and unsafe proxy request rejection. |
| `pnpm --filter @ventro/api start`, `pnpm --filter @ventro/web start`     | Both production artifacts started; readiness probes returned 200 with real PostgreSQL/Redis. Root development settings intentionally remained in use for local HTTP.                                                                                                                                  |
| `pnpm test:smoke`                                                        | Passed real readiness, frontend proxy, secure CORS, request IDs, versioned OpenAPI, eighteen public pages, metadata/OG/sitemap/brand assets, protected accounts, and development-route production 404s.                                                                                               |
| `PLAYWRIGHT_PRODUCTION=1 pnpm --filter @ventro/web test:ui auth.spec.ts` | **7 passed on the production frontend**. Real registration, verification, persisted profile, session rotation, logout, reset/relogin, Arabic mobile flow, accessibility/themes, and forged-session protection.                                                                                        |
| Final `pnpm lint`, `pnpm format:check`, `git diff --check`               | Passed after documentation and generated-report ignore updates, with browser reports present.                                                                                                                                                                                                         |

Desktop/mobile registration and English/Arabic account screenshots were visually reviewed; captures are retained under ignored `.local/screenshots`. Browser fixtures are owned `.test` users and are removed by the Node-only test helper; there is no cleanup endpoint. Mailpit retains local test messages under its development retention policy.

Resolved during verification: timestamp interpretation on a database defaulting to Asia/Amman required explicit UTC connection sessions; a live-clock and expiry-bound regression was added. Test HTTP servers now listen persistently during concurrent requests to avoid Windows native worker failures from ephemeral server shutdown. The auth proxy binds its allowed Origin to the real Host rather than Next's internally canonicalized URL. Token fragments survive React StrictMode effect replay while still being removed from the visible URL. Browser test cleanup stays in the API test workspace, avoiding races against API build output during parallel monorepo typechecks, and supports Playwright's CommonJS loader. Generated Playwright reports are excluded from ESLint so a failure report cannot contaminate subsequent source linting. Initial failed verification attempts were corrected and the relevant suites were rerun successfully.

### Known limitations and next dependencies

Docker Engine/Desktop remains absent on this host. Compose configuration is checked; actual PostgreSQL/Redis/Mailpit verification uses ignored native tooling and persisted local data. Mailpit v1.33.1's official Windows archive was SHA-256 verified before execution. No remote GitHub Actions run or deployment is claimed.

Production still requires an approved HTTPS domain, SMTP sender/provider/TLS, legal operator/policies, private secret management/rotation, trusted ingress/client-IP handling, and load/abuse testing. The local server proxy shares its network-rate bucket across frontend users; account buckets remain separate. See AUTHENTICATION for the exact limitation and policy. Earlier mobile marketing performance findings remain documented; this phase does not claim to have removed them.

There is no OAuth, MFA, self-service account deletion/email change, organization-management UI, event management, or production hosting in this phase. Those require separate authorization. Unverified accounts can use only their own account functions; future business routes must require the approved authentication/verification/tenant guards. Public policies describe actual account data and remain drafts pending launch approval.

No Phase 4 implementation blocker remains. A next phase requires an explicit prompt and approved domain/role requirements; it must reuse and test session, email-verification, and organization authorization rather than accepting submitted actor/tenant claims. Preview/API processes used for verification are stopped after checks; local PostgreSQL, Redis, and Mailpit development services/data are retained. No Git commit, push, remote CI run, or deployment was performed by this verification.

## Phase 5 implementation

Phase 5 is implemented and verified. All earlier working-tree changes were preserved; no reset, commit, push or deployment was performed.

### Completed features

- Persistent organization creation/profile/settings, static sanitized private logo upload/removal, paginated directory, multi-organization membership and session-scoped switching.
- Explicit OWNER, EVENT_MANAGER, CHECK_IN_STAFF and PARTICIPANT membership roles. Global PLATFORM_ADMIN is separate, operator-provisioned, and limited to a read-only organization directory without implicit tenant access.
- Real encrypted SMTP invitations for existing/new users, verified-recipient resolution/inbox/accept/reject, seven-day expiry, reissue/revoke, concurrent single-use consumption and issuer membership checks.
- Current session/credential/user/verification and tenant membership/permission validation inside authorized transactions. Locks protect member changes, concurrent acceptance and last-active-owner rules. Removal clears active selections across sessions; owner demotion/removal revokes issued pending invites.
- English/Arabic organization, creation, settings, team, invitation and platform pages with role-based navigation, real connected actions, both themes, RTL/mobile layouts, confirmation dialogs, loading/empty/error/success states and noindex.
- Transactional organization audit records, safe DTO/body limits, dedicated Redis policies, bounded JSON/multipart same-origin proxies, protected page checks and local audited platform operator CLI. Existing authentication/public-site/design-system behavior preserved.

### Modified files and database changes

- `apps/api/prisma/schema.prisma` and new `20261113000000_organizations_rbac/migration.sql`: organization profile fields; User platform role; Session active organization FK; OrganizationLogo and OrganizationInvitation; nullable outbox user/linked invitation and new email kind. Existing ADMIN → EVENT_MANAGER and MEMBER → PARTICIPANT memberships preserved through enum renames; OWNER unchanged. Applied to local development PostgreSQL. Prisma reports no schema drift.
- `apps/api/src/organizations/*`: module, controllers, DTOs, service, origin/platform guards and transaction-aware membership helper. `src/app.module.ts`, auth exports/service/guards/email/audit, no-store configuration, and `prisma/platform-admin.mjs`.
- `packages/types/src/index.ts`: organization/member/invitation/platform schemas, paginated contracts, permission matrix and safe session/platform fields.
- `apps/web/src/components/organizations/*`, `src/lib/organizations/*`, localized `(workspace)` pages/loading/error, organization/platform API handlers, workspace stylesheet/global import, Proxy, safe login destination and account-to-workspace navigation. Public privacy copy describes actual organization data and team visibility.
- API/web/root manifests and lockfile: bounded image normalization with Sharp, multipart type definitions, direct existing Zod dependency, offline operator script. No extra hosted storage or queue service.
- Real integration suite and owned browser-fixture helper; frontend boundary/browser tests; smoke and CI browser labels; README and maintained architecture/roadmap/state/auth/organization docs.

### Commands executed and observed results

Windows commands used the existing local invocation `npm.cmd exec --prefix .tools -- pnpm …`. Real PostgreSQL, Redis and SMTP/Mailpit were reachable throughout successful runtime checks.

| Command / check                                                                                      | Observed result                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation, `pnpm db:generate`, `pnpm db:validate`                                      | Passed; generated strict Prisma models and validated the updated schema.                                                                                                                                                                                                                                                                                                   |
| `pnpm db:deploy`                                                                                     | Applied `20261113000000_organizations_rbac` to the local development database while preserving existing data and memberships.                                                                                                                                                                                                                                              |
| Prisma `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`          | Passed: no difference detected between the applied database and schema.                                                                                                                                                                                                                                                                                                    |
| Final `pnpm check`                                                                                   | Passed original SVG consistency, formatting, zero-warning lint, all strict workspace typechecks, **24 API + 15 web unit/HTTP/contract/boundary tests**, and both production builds.                                                                                                                                                                                        |
| Final `pnpm test:integration`                                                                        | **27 passed**: fourteen organization/RBAC cases plus the existing authentication and dependency/clock suite. Actual isolated PostgreSQL databases, migrations, Redis counters, Mailpit email, platform CLI, private binary uploads, races and audits were exercised.                                                                                                       |
| `pnpm --filter @ventro/web test:ui`                                                                  | **29 passed**: seven auth, eight design-system, ten marketing and four organization lifecycle scenarios. Includes actual invite email/accept/decline, role changes/removal, last-owner rejection, expired invitations, multi-organization switching and limited global directory.                                                                                          |
| Production artifact startup and readiness probes                                                     | Next.js and NestJS started successfully; readiness returned 200 with actual PostgreSQL/Redis. Local development HTTP/SMTP settings intentionally remained in use.                                                                                                                                                                                                          |
| Final `pnpm test:smoke`                                                                              | Passed readiness, frontend proxies, secure CORS/request IDs, versioned auth/organization/platform OpenAPI, all eighteen public pages, metadata/OG/sitemap/assets, private-route redirects and production-only development-route 404s.                                                                                                                                      |
| Final `PLAYWRIGHT_PRODUCTION=1 pnpm --filter @ventro/web test:ui auth.spec.ts organizations.spec.ts` | **11 passed on the final production frontend**, after the private-link prefetch and disabled-owner refinements. Full auth/recovery and organization flows, EN/AR light/dark desktop/mobile axe, verified email, switching, expiry, unauthorized page/API access, role navigation and platform boundaries passed. QA used a separate Redis namespace with unchanged limits. |
| Final source review                                                                                  | Lint, format and whitespace checks passed; the final documentation-only updates are formatted and rechecked before handoff.                                                                                                                                                                                                                                                |

English settings, English team and Arabic mobile settings screenshots were visually reviewed, including final production captures under ignored `.local/screenshots`. All test records use unique local `.test` identities; browser fixtures remove only their own records. Two inactive databases left by interrupted native test workers were verified to contain only matching run-UUID users/organizations before removal. The development database, seed and any unrelated user data were preserved.

Resolved during verification: explicit RedisModule visibility was required for imported Nest guards; direct frontend Zod versions were aligned with shared contracts after a mismatch exhausted TypeScript's heap. Windows Vitest fork failures while hosting the app inside its worker were eliminated in observed complete runs by starting the compiled integration API in a separate Node process with private IPC readiness/shutdown. The full API suite subsequently passed repeatedly, including the final 27-case run. No claim of a diagnosed Node native root cause is made.

The first Arabic browser attempt used an English login with an intentionally rejected foreign-locale return path; the test now follows the supported locale path. The shared browser lifecycle is explicitly serial so later stages cannot run against a failed/cleaned fixture. A first combined production attempt hit a session rate window shared with earlier development traffic. Private links now disable speculative prefetch, and owned browser API processes use their own rate namespace; authentication limits were not raised or bypassed. All eleven final production auth/organization scenarios then passed. The last-owner rule additionally permits removal of an already disabled owner while retaining the active owner, verified by a dedicated real-service regression.

### Known issues and next phase dependencies

No Phase 5 implementation blocker remains. The host still lacks Docker Engine; real PostgreSQL/Redis/Mailpit native services and preserved local data were used. Compose definitions remain unchanged from the verified Phase 4 setup; container execution and remote CI/deployment are not claimed. Owned frontend/API preview processes are stopped after verification; persistent local development services/data are retained.

Production requires the existing HTTPS/SMTP/secret/legal/ingress/backup/abuse-control decisions and a reviewed trusted Platform Admin provisioning procedure. Frontend proxy network-rate buckets remain shared across users, as documented in AUTHENTICATION. No RLS or external security audit is claimed. Logo storage and organization/team caps are explicit initial limits in ORGANIZATIONS, not approved pricing plans. Organization/invitation records require managed deletion; no organization-delete, archive, owner-impersonation or full platform-operations console is implemented.

Event operations and event-level staffing/participant rules require a later explicit prompt and verified Phase 5. They must reuse current session, verified-email, tenant and permission checks and add their own cross-tenant tests. Earlier mobile marketing performance findings remain unchanged; this phase does not claim new Lighthouse scores.

## Phase 10 local verification update

### Completed features

- Applied `20261114093000_live_engagement` locally. It creates polling and Q&A persistence with uniqueness constraints for participant votes.
- Verified a real Socket.IO namespace with two authorized connected clients: a vote from one client was broadcast as updated results to the other. An authenticated user without event membership/registration received `room:error` and was disconnected.
- Added a protected presenter results page and safe post-login return paths for `/events/:slug/live` and `/events/:slug/presenter`. The presenter receives organizer-only poll data; the participant live room remains authorized by the backend.

### Modified files

- `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261114093000_live_engagement/*`, and `apps/api/src/engagement/*`.
- `apps/web/src/components/engagement/*`, live/presenter routes, engagement proxy, dashboard navigation, and authentication return-path validation.
- `apps/api/test/registrations.integration.ts`, `apps/web/test/ui/engagement.spec.ts`, and `apps/web/test/organization-boundary.test.ts`.

### Commands and results

| Command / check                                                           | Observed result                                                                                               |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ventro/api db:deploy`                                     | Applied `20261114093000_live_engagement` successfully to local PostgreSQL.                                    |
| Focused Socket.IO integration test                                        | Passed: authorized multi-client result broadcast and unauthorized room rejection.                             |
| Focused registration/ticket/engagement integration suite                  | Passed 7 tests, including persisted votes/Q&A and live socket coverage.                                       |
| `pnpm --filter @ventro/web test -- organization-boundary.test.ts`         | Passed 15 tests, including new live/presenter safe-return assertions.                                         |
| `pnpm --filter @ventro/web test:ui engagement.spec.ts`                    | Passed local authenticated-browser flow for live room, organizer engagement dashboard, and presenter results. |
| `pnpm lint`, API build/typecheck, web typecheck/build, `git diff --check` | Passed after correcting the effects cleanup and lint findings.                                                |

### Known issues and next dependencies

The local checks use the portable PostgreSQL/Redis services because Docker Engine is unavailable. Presenter access is authenticated and data remains organizer-authorized at the API; a future presenter assignment model can narrow page-level access further. The full historical integration command was not accepted as a phase gate in this run because separately launched legacy suites overlapped during exploratory verification; focused Phase 10 coverage above is the valid result.

## Phase 11 implementation update

### Completed features

- Applied `20261114110000_certificates_passport` locally. It adds certificate templates, generated/revoked certificates, public verification IDs, private PDF bytes, participant passports, and separate passport visibility settings.
- Added tenant-scoped template creation, eligible issuance, revocation, certificate download, public verification, private passport settings, and privacy-filtered shareable Passport reads.
- Eligibility is evaluated server-side from confirmed registration, event completion, event check-in by default, and an optional required-session list. Issuance is idempotent per registration/template.
- BullMQ processes certificate PDF jobs against Redis with retry/backoff. PDFs contain snapshot recipient/event values, organization name, issue date, learning hours, and a verification ID; failures are marked `FAILED` and revoked certificates cannot regenerate.
- Added authenticated Passport and public verification/Passport pages. Certificate and Passport routes use the existing same-origin cookie relay and server-side privacy enforcement.

### Commands and results

| Command / check                                                     | Observed result                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm --filter @ventro/api db:generate`, `db:validate`, `db:deploy` | Prisma client/schema validated and migration applied to local PostgreSQL.                         |
| Focused certificate integration test                                | Passed: eligible PDF generation, download, public verification, revocation, and Passport privacy. |
| API build, web typecheck, lint, web build, `git diff --check`       | Executed after implementation; no source errors reported before handoff.                          |

### Known issues and next dependencies

The certificate PDF is intentionally a first branded text layout using the organization name; adding uploaded background templates or localized PDF typography needs approved design assets and Arabic-font embedding. Jobs run in the API process for this modular-monolith foundation; a separate worker deployment is an operational scaling decision. Phase 12 remains queued until Phase 11 browser-regression coverage is expanded beyond the focused backend/PDF check.

## Phase 12 sub-milestone 12A

- Added and locally applied `20261114123000_analytics_notifications`: persisted `Notification`, `NotificationPreference`, an idempotency key, notification categories, and user/organization/event query indexes.
- Prisma generation and validation passed; `db:deploy` applied the migration successfully to local PostgreSQL.
- Remaining 12B work: tenant-scoped analytics queries/CSV, event-driven notification creation, preference-aware BullMQ email delivery, local Mailpit retry verification, and the dashboard/chart interfaces. No fabricated analytics or placeholder delivery behavior has been added.
