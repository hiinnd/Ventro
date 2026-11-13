# Roadmap

Phases 1–5 are implemented and verified within their stated scope. Phase 6 organizer dashboard is authorized and in progress. Exact results and host limitations are in PROJECT_STATE. Later entries are dependencies for future planning, not permission to implement.

Phase 2 milestones:

- **2A · Brand and tokens:** original SVG identity, local typography, themes, spacing, contrast; verified by SVG consistency and strict typechecks.
- **2B · Reusable UI:** controls, overlays, content, feedback, navigation, and RTL; verified through the development-only showcase and keyboard behavior.
- **2C · Verification:** both themes/languages, desktop/mobile, reduced motion, axe, production guard; actual results belong in PROJECT_STATE.

Phase 3 milestones:

- **3A · Narrative and public routes:** nine complete pages in English/Arabic, original brand styling, licensed local photography, truthful proposed pricing and preview states.
- **3B · Interaction and discovery:** accessible responsive navigation, URL language switching, themes, product/lifecycle/Passport previews, concept-gallery filters/dialogs, FAQ search, and local contact-brief preparation.
- **3C · Release review:** metadata/Open Graph/sitemap/robots, eighteen-page link verification, responsive/theme/RTL/axe/browser tests, production smoke, Lighthouse review, and strict workspace checks. Actual results are recorded in PROJECT_STATE.

Phase 4 milestones:

- **4A · Database and security services:** initial reviewed migration, password/session/token models, organization membership foundation, security audit, encrypted email outbox, local Mailpit, and a safe idempotent development seed.
- **4B · Real authentication:** register/login/logout, verification/resend, forgot/reset, renewal, protected profile, DTO/CSRF/rate/error infrastructure, and localized connected frontend pages.
- **4C · Verification:** real isolated-database/Redis/SMTP integration, races and isolation, browser email/recovery/cookie flows, theme/RTL/axe regression, strict workspace checks, builds, and production smoke. Actual outcomes belong in PROJECT_STATE.

Public launch still needs an approved domain, contact email, legal operator/policies, production SMTP, pricing if offered, trusted ingress/rate-limit handling, and deployment arrangements. Organization management is now authorized in Phase 5; event business features require an explicit later prompt and verified Phase 5.

Phase 5 milestones:

- **5A · Tenant model and permissions:** preserve existing memberships while migrating roles; add organization profile, private logo, invitations, active session preference, explicit platform permission, transactions and audit records.
- **5B · Organization workspace:** real localized organization/settings/team/invitation pages, switching, role-based navigation and limited platform directory, with existing design tokens and accessible controls.
- **5C · Verification:** real isolated-database/Redis/SMTP tests for isolation, each role, expired/replaced/revoked/concurrent invitations, membership changes, last-owner races, private uploads, platform provisioning; browser flows, regression checks, strict workspace tests/builds and production smoke.

Phase 5 does not authorize event creation, attendance, registration, ticketing or payments. Future event permissions must distinguish organization membership from event-level assignments and use the verified tenant boundary.

| Milestone                       | Scope                                                                                        | Gate                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1A · Workspace                  | pnpm, strict config, shared packages, environment, infrastructure definitions                | Install and Prisma generation               |
| 1B · HTTP and web foundation    | Health, secure HTTP infrastructure, frontend connection, localization and themes             | Lint, typecheck, tests, builds              |
| 1C · Runtime verification       | Real dependency integration, frontend/backend smoke, CI, documentation                       | Actual observed results in PROJECT_STATE    |
| 4 · Identity foundation         | Password accounts, sessions, token email, memberships, safe profile and tests                | Exact verification results in PROJECT_STATE |
| 5 · Organizations and RBAC      | Verified tenant membership, settings/logos, team roles/invites, switching, platform boundary | Exact verification results in PROJECT_STATE |
| Future · Event domains          | Approved event lifecycle and role requirements                                               | Identity and tenant isolation verified      |
| Future · Async and live updates | BullMQ jobs and Socket.IO only for approved use cases                                        | Business behavior and idempotency defined   |
| Future · Production operations  | Deployment, backups, observability, restore testing, load tests                              | Hosting and operational requirements agreed |

Do not start a later phase while a current verification requirement remains unresolved. Consult PROJECT_STATE for the exact current gate and host limitations.
