# Operations runbook

## Ownership and observability

Assign named on-call ownership before any pilot. Retain structured API logs with request IDs; restrict log access because they are operationally sensitive. Add an error-monitoring service and alert routing before public access—neither is configured by this repository alone.

## Health checks

| Check                  | Expected response                              | Action on failure                                                               |
| ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `GET /api/health/live` | 200; process alive                             | Inspect API deployment/ingress logs and roll back bad artifact if needed.       |
| `GET /api/health`      | 200; PostgreSQL and Redis ready                | Identify dependency failure; do not route write traffic while readiness is 503. |
| Web homepage           | 200 and correct locale redirect                | Inspect web logs, API proxy configuration, CDN/domain state.                    |
| Queue/SMTP             | jobs complete and messages visible in provider | Pause new deliveries, inspect retries/dead-letter state, do not resend blindly. |

## Incident response

1. Declare severity, incident lead, timestamp, and affected tenant/event.
2. Preserve request IDs, deployment revision, queue job IDs, and audit records.
3. Contain: disable unsafe feature flag or rollback the artifact. Do not delete records or logs.
4. Verify tenant boundaries, session security, and whether personal data was exposed.
5. Communicate only approved facts; notify affected users/regulators according to the approved privacy plan.
6. Document root cause, remediation, owner, and a regression test before closure.

## Backup and recovery

- Use managed PostgreSQL automated backups and point-in-time recovery; define retention with the data owner.
- Back up object-storage metadata and ensure object versioning/lifecycle rules align with certificates/uploads.
- Redis is not the system of record; PostgreSQL is. However, recover queue/rate-limit behavior deliberately after Redis loss.
- Rehearse a restore into an isolated environment before pilot. Validate sessions, migrations, audit data, tickets, attendance, certificates, and Passport privacy after restore.

## Routine release checks

- Verify secret rotation status, certificate expiry, domain DNS/TLS, database capacity, Redis memory, SMTP reputation/bounces, backup success, error budget, and queue retries.
- Run migrations as a controlled job, not from every API replica.
- Review failed certificate/email jobs idempotently; never manually duplicate tickets, attendance, or certificates to “fix” a display issue.

## Pilot stop conditions

Stop registrations/check-in and switch to a documented manual fallback if tenant data crosses boundaries, QR validation accepts an invalid/revoked ticket, live-room authorization fails, certificate verification is incorrect, or availability/security monitoring is unavailable.
