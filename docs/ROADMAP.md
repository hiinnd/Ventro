# Roadmap

Only Phase 1 is authorized. Later entries are dependencies for future planning, not permission to implement.

| Milestone                       | Scope                                                                            | Gate                                        |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------- |
| 1A · Workspace                  | pnpm, strict config, shared packages, environment, infrastructure definitions    | Install and Prisma generation               |
| 1B · HTTP and web foundation    | Health, secure HTTP infrastructure, frontend connection, localization and themes | Lint, typecheck, tests, builds              |
| 1C · Runtime verification       | Real dependency integration, frontend/backend smoke, CI, documentation           | Actual observed results in PROJECT_STATE    |
| Future · Identity and tenancy   | Approved user/tenant model, authentication, authorization, isolation tests       | Explicit phase prompt; Phase 1 accepted     |
| Future · Event domains          | Approved event lifecycle and role requirements                                   | Identity and tenant isolation verified      |
| Future · Async and live updates | BullMQ jobs and Socket.IO only for approved use cases                            | Business behavior and idempotency defined   |
| Future · Production operations  | Deployment, backups, observability, restore testing, load tests                  | Hosting and operational requirements agreed |

Do not start a later phase while a current verification requirement remains unresolved. Consult PROJECT_STATE for the exact current gate and host limitations.
