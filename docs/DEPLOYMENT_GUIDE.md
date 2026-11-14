# Production deployment guide (preparation only)

VENTRO has **not** been deployed by this phase. This guide is a controlled deployment plan, not evidence of a live service.

## Target topology

| Component   | Deployment requirement                                                                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Next.js web | Managed Node/Next hosting with a custom HTTPS domain, server runtime support, and same-origin proxy configuration.                                                                                |
| NestJS API  | Container or managed Node service with at least two replicas when WebSocket scaling is required. Terminate TLS at the ingress and retain sticky-session or Socket.IO-compatible scaling strategy. |
| PostgreSQL  | Managed PostgreSQL with private networking, point-in-time recovery, encrypted backups, least-privilege application role, and alerting.                                                            |
| Redis       | Managed Redis with TLS/authentication, persistence suitable for queue/rate-limit needs, eviction policy review, and private networking.                                                           |
| Uploads     | Private S3-compatible object storage with server-issued upload/access policy, malware scanning decision, lifecycle policy, and no public listing.                                                 |
| Email       | Verified production SMTP/transactional provider with DKIM, SPF, DMARC, bounce handling, and a separate staging sender. Mailpit is development-only.                                               |

## Required production environment

- Generate and store a unique `AUTH_SECRET` in the host secret manager; never copy local values.
- Set `NODE_ENV=production`, `SITE_URL=https://<approved-domain>`, `AUTH_APP_URL` to the same HTTPS origin, and exact comma-separated `WEB_ORIGINS`.
- Set managed `DATABASE_URL` and `REDIS_URL` using TLS where offered. Do not expose either service publicly.
- Set production SMTP credentials, `SMTP_FROM`, legal `CONTACT_EMAIL`, and `LEGAL_OPERATOR_NAME` only after approval.
- Set `SWAGGER_ENABLED=false` unless access to production API documentation is explicitly controlled.
- Leave `AI_PROVIDER=disabled` unless a provider agreement, key, data-processing review, limit, and operator approval are complete.
- Keep all seed variables empty and do not run development seed scripts in production.
- Do not set a payment-provider credential until Phase 13 is complete and a verified provider is selected.

## Release sequence

1. Build immutable web/API artifacts from a protected commit; run the Phase 15 checks in CI.
2. Provision managed PostgreSQL, Redis, object storage, secret manager, SMTP, TLS domain, logs, and monitoring.
3. Take and verify a pre-migration database backup.
4. Run `pnpm db:deploy` exactly once as a release job, using the production database URL.
5. Deploy API, then web. Check `GET /api/health/live` and `GET /api/health` through the intended ingress.
6. Run a smoke test with a dedicated staging/pilot account: registration, organizer access, event publication, ticket, check-in, live room, certificate verification, and private Passport rejection.
7. Enable indexing only when domain, privacy/terms, contact/legal operator, and monitoring are approved.

## Rollback

- Roll back web/API artifacts first; do not restore a database merely to roll back code.
- Prisma migrations must be forward-compatible. Prepare a reviewed compensating migration for every destructive schema change.
- Restore PostgreSQL only after incident lead approval and a rehearsed point-in-time procedure. Preserve audit/security evidence before any restore.
- Disable nonessential queues/features (AI, certificate issuance, email campaigns) through deployment configuration during an incident; preserve core authentication and health checks where safe.

## Payment-provider requirement for Jordan

No provider is selected. Before payments are enabled, the business must validate current Jordan legal/entity eligibility, settlement currency, chargeback/refund support, PCI responsibilities, webhook verification, sanctions/KYC obligations, tax/invoicing, and production support directly with the chosen provider and legal counsel. Development billing simulation must remain visibly non-production and never create a record that resembles a captured payment.
