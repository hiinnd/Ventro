# Roadmap

Phases 1, 2, and 3 are authorized and verified within their stated scope. Phase 3 includes the public website and documented Lighthouse findings, including remaining mobile performance cost. Later entries are dependencies for future planning, not permission to implement.

Phase 2 milestones:

- **2A · Brand and tokens:** original SVG identity, local typography, themes, spacing, contrast; verified by SVG consistency and strict typechecks.
- **2B · Reusable UI:** controls, overlays, content, feedback, navigation, and RTL; verified through the development-only showcase and keyboard behavior.
- **2C · Verification:** both themes/languages, desktop/mobile, reduced motion, axe, production guard; actual results belong in PROJECT_STATE.

Phase 3 milestones:

- **3A · Narrative and public routes:** nine complete pages in English/Arabic, original brand styling, licensed local photography, truthful proposed pricing and preview states.
- **3B · Interaction and discovery:** accessible responsive navigation, URL language switching, themes, product/lifecycle/Passport previews, concept-gallery filters/dialogs, FAQ search, and local contact-brief preparation.
- **3C · Release review:** metadata/Open Graph/sitemap/robots, eighteen-page link verification, responsive/theme/RTL/axe/browser tests, production smoke, Lighthouse review, and strict workspace checks. Actual results are recorded in PROJECT_STATE.

Public launch still needs an approved domain, contact email, legal operator/policies, pricing if offered, and deployment arrangements. Identity/tenancy and all business features require an explicit later prompt and verified Phase 3.

| Milestone                       | Scope                                                                            | Gate                                        |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| 1A · Workspace                  | pnpm, strict config, shared packages, environment, infrastructure definitions    | Install and Prisma generation               |
| 1B · HTTP and web foundation    | Health, secure HTTP infrastructure, frontend connection, localization and themes | Lint, typecheck, tests, builds              |
| 1C · Runtime verification       | Real dependency integration, frontend/backend smoke, CI, documentation           | Actual observed results in PROJECT_STATE    |
| Future · Identity and tenancy   | Approved user/tenant model, authentication, authorization, isolation tests       | Explicit phase prompt; Phase 3 verified     |
| Future · Event domains          | Approved event lifecycle and role requirements                                   | Identity and tenant isolation verified      |
| Future · Async and live updates | BullMQ jobs and Socket.IO only for approved use cases                            | Business behavior and idempotency defined   |
| Future · Production operations  | Deployment, backups, observability, restore testing, load tests                  | Hosting and operational requirements agreed |

Do not start a later phase while a current verification requirement remains unresolved. Consult PROJECT_STATE for the exact current gate and host limitations.
