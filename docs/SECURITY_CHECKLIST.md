# Security checklist

## Must be complete before pilot

- [ ] Production secrets are in a managed secret store, rotated from development values, and absent from logs/build artifacts.
- [ ] HTTPS, HSTS/ingress security headers, exact CORS origins, secure cookies, DNS ownership, and domain redirect policy are verified.
- [ ] Managed PostgreSQL/Redis/object storage are private, encrypted, least-privilege, and monitored.
- [ ] `pnpm db:deploy` is reviewed and a backup/rollback plan exists.
- [ ] Error monitoring, structured-log access control, health alerts, and incident contacts are tested.
- [ ] File-upload policy includes size/type validation, object-access authorization, malware-scanning decision, and retention.
- [ ] Rate limits and abuse response are tuned from pilot traffic without weakening auth protections.
- [ ] Socket.IO ingress origin/cookie behavior and multi-replica adapter strategy are tested.
- [ ] Public certificate/Passport fields are reviewed with privacy owner; revoked certificates are tested again.
- [ ] Independent security review covers authentication, authorization, tenant isolation, CSRF/origin handling, API permissions, uploads, and WebSocket paths.

## Verified in local QA

- [x] Strict validation, safe errors, HTTP-only session design, Argon2id credentials, backend authorization, tenant tests, transactional uniqueness, and authenticated live-room checks are covered by code/tests.
- [x] No payment flow is enabled or presented as a real payment.

Local verification does not satisfy production configuration, penetration testing, compliance, or operations requirements.
