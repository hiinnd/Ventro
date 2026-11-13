# Authentication foundation

Phase 4 adds password accounts and database-backed sessions. It does not add event operations, organization-management UI, provider login, payments, or an administrative user API.

Phase 5 subsequently adds organization management on this authentication foundation. The current role, invitation, tenant and private-upload policies are documented in [ORGANIZATIONS](ORGANIZATIONS.md); the Phase 4 scope above describes that historical milestone.

## Models and boundaries

The committed migration creates `User`, `Session`, `EmailVerificationToken`, `PasswordResetToken`, `Organization`, `OrganizationMember`, `AuditLog`, and `EmailOutbox`. Password-only credentials live on `User`; an external-provider `Account` table is unnecessary until OAuth is explicitly approved. Registration does not create an organization or grant any organization role.

Emails are trimmed/lowercased and unique, with a database normalization constraint. Names and email-language preference are editable; email is read-only in this phase. Membership uses a composite organization/user key and OWNER/ADMIN/MEMBER roles scoped to that organization. `OrganizationAccessService.requireMembership` checks the authenticated actor's current membership, allowed roles, active user status, and non-archived organization. Future endpoints must pass the actor from the validated session, never a submitted actor or tenant ID. No organization data endpoint is currently exposed.

All application and seed Prisma connections set PostgreSQL session timezone to UTC. This is essential for correct adapter serialization, token expiration, outbox leases, and SQL `NOW()` comparisons even when the host database defaults to Asia/Amman. Integration tests compare database/application clocks and token lifetime bounds.

## HTTP contract

Browser code calls `/api/auth/<action>` on the Next.js origin. An explicit action/method allowlist forwards only to the configured internal NestJS origin; it is not an open URL proxy. The backend's routes are versioned under `/api/v1/auth`. Swagger includes the cookie scheme and required mutation headers.

| Method and action          | Authorization and result                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST `register`            | Validated name/email/password/optional locale; generic 202 for new or existing addresses; atomic user/token/outbox/audit transaction.                   |
| POST `login`               | Generic 401 for wrong, unknown, or disabled accounts; creates a new session and sets an HTTP-only cookie.                                               |
| POST `logout`              | Idempotently revokes the supplied current session and clears its cookie; 204.                                                                           |
| GET `session`              | Valid session required; safe user projection and idle/absolute expiration.                                                                              |
| GET `profile`              | Valid session required; only the current user's safe profile.                                                                                           |
| PATCH `profile`            | Valid session required; validated name/locale only; session/version rechecked under a user-row lock.                                                    |
| POST `renew`               | Valid unexpired session required; atomically rotates its secret and extends idle expiry within the original absolute limit.                             |
| POST `verify-email`        | Valid single-use verification token; explicit POST, never a side-effecting GET.                                                                         |
| POST `resend-verification` | Valid session; replaces prior unused links when verification is needed.                                                                                 |
| POST `forgot-password`     | Same generic 202 for eligible and unknown addresses; durable encrypted delivery for eligible accounts.                                                  |
| POST `reset-password`      | Valid single-use reset token and new password; revokes all sessions and other unused reset tokens; queues a password-change notice. No automatic login. |

Protected account pages are `/en/account` and `/ar/account`. Proxy rejects unauthenticated/forged/expired sessions before streaming with a login redirect; the server page verifies again before rendering. Backend authorization remains mandatory regardless of frontend routing. API outages fail closed and do not expose profile data. All authentication pages are noindex and excluded from the public sitemap.

Unverified users may authenticate to their own profile and resend verification. `SessionGuard` and reusable `VerifiedEmailGuard` are available for later approved business modules; no event capability is granted by merely having a session.

## Credential and session policy

- Passwords accept 12–128 characters for registration/reset, including spaces and Arabic. They are not trimmed, logged, or stored reversibly. Argon2id uses 64 MiB memory, three iterations, and one lane. Per-process password work is bounded to two active operations and eight waiting operations.
- Unknown-account login verifies against a startup-generated dummy Argon2id hash. Error responses do not disclose account existence or disabled status. Forgot-password and registration return the same accepted response for existing/unknown addresses as applicable; this is not a claim of mathematically constant-time network responses.
- Each login generates a 256-bit opaque token. PostgreSQL stores only SHA-256 hashes of session, verification, and reset tokens. Session values are absent from JSON responses and browser storage APIs.
- Sessions have a seven-day rolling lifetime, thirty-day absolute lifetime, and a cap of ten concurrent sessions per user. Renewal rotates the token using an atomic conditional update; concurrent renewals yield one winner. Old tokens stop authenticating immediately. A 401 does not clear cookies automatically, avoiding a losing concurrent response deleting a newly rotated cookie. Explicit logout/reset clear cookies.
- Production uses `__Host-ventro_session`, Secure, HttpOnly, SameSite=Lax, Path=/, with no Domain. Local HTTP development uses `ventro_session` without Secure. API production startup refuses non-HTTPS application origins, plaintext SMTP configuration, and the development `.test` sender.
- Password resets increment a credential version. Login rechecks the password/version/status under a user lock after expensive hashing; renewal/profile mutation recheck current state. This prevents reset/login and reset/renew races from restoring old credentials. Reset/verification token consumption is atomic and tested with concurrent requests.
- Verification expires in 24 hours; reset links in 30 minutes. New requests replace old unused tokens. Links use `#token=…`, so tokens are not sent in URL paths/query strings or ordinary referrers. Pages read and remove the fragment, retain the token only in memory, and require an explicit button action. Reloading after removal requires opening the original email link again.

The implementation follows the relevant [OWASP password-storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [session guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), and [password-recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). These references do not constitute an external security audit.

## CSRF, validation, abuse controls, and logs

Authentication mutations require an exact allowed Origin, `application/json`, and `X-Ventro-CSRF: 1`; cross-site Fetch Metadata requests are rejected. The Next.js proxy additionally matches the browser-facing Host against that origin; its internally canonicalized request URL is not used as a substitute for the real Host. Ingress must preserve the legitimate Host. This is the [custom-header/strict-origin CSRF pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), not a secret carried by the custom header. CORS stays exact and does not enable cross-origin cookie sharing. Cookies are forwarded by the server proxy, not read by client JavaScript.

Both HTTP boundaries cap JSON at 16 KiB. The API validates DTOs server-side, rejects unknown fields on data-bearing DTOs, bounds string lengths, normalizes email, and never accepts client ownership/role/expiration claims. The proxy also validates successful response contracts and strips errors to safe messages. Malformed/oversized request bodies produce safe 400/413 responses. Redis failure fails authentication rate checks closed with 503.

Rate limits use atomic Redis INCR/expiry, a configurable namespace, and keyed hashes of account/network identifiers. Limits include registration 20/network and 3/address per 15 minutes; login 60/network and 10/address per 15 minutes; recovery 30/network and 3/address per 15 minutes. Other actions have their own bounded policies. Exceeding a limit returns 429 with Retry-After. Limits persist across API restarts. Client-supplied forwarding headers are not trusted.

**Deployment constraint:** with the local same-origin server proxy, network limits observe the frontend server's socket address and are shared across its users. Account-level limits remain separate. Before public deployment, approve trusted ingress/client-IP handling, ingress abuse controls, shared-network thresholds, and load testing. Do not enable arbitrary X-Forwarded-For trust to bypass this constraint. No Internet-scale traffic capacity is claimed by this phase.

Pino excludes request bodies/queries and redacts cookie/authorization/Set-Cookie fields. The exception filter logs a safe error class and request ID instead of serializing potentially sensitive parser/SMTP/database exceptions. Audit records include fixed event names, actor/request IDs, keyed network hashes, and limited metadata; they exclude raw passwords, tokens, addresses, and IPs. Audit writes for successful security mutations occur in the same database transaction. API code provides no audit-edit endpoint; append-only behavior here is an application boundary, not a claim that a database owner cannot alter rows.

## Durable local email

Mailpit v1.33.1 is configured in Compose on loopback SMTP 1025 and inbox 8025, with a persistent development mailbox. This host lacks Docker; verification also uses the official checksum-verified Windows binary in ignored local tooling. Mailpit never relays these test messages to external recipients.

Email intent is committed with the relevant account/token mutation. The outbox encrypts the recipient/link/locale payload with AES-256-GCM, random 96-bit nonces, authenticated version context, and an HKDF-derived key from `AUTH_SECRET`. The API's worker polls every two seconds, claims a row with a sixty-second lease and SKIP LOCKED, and sends through configured Nodemailer SMTP. Retries use exponential backoff, cap delays at five minutes, and stop after eight attempts. Crashed leases can be reclaimed by another instance. Delivery is at least once; Message-ID is stable, but SMTP exactly-once delivery is not promised. Duplicate token emails remain safe because consumption is single use.

Sent payloads are cleared after SMTP acceptance, obsolete/expired payloads are cancelled, and SMTP failures log only a delivery ID. Hourly maintenance removes sessions/tokens expired or consumed more than a day ago, completed/failed outbox metadata after seven days, and audit rows after ninety days. Account records are not automatically deleted. If the API is stopped, maintenance resumes on the next worker run. Final retention/provider/operator policies remain a production-launch decision reflected by draft public policies.

Keep `AUTH_SECRET` stable and private. Rotating it makes pending encrypted deliveries unreadable and changes pseudonymous keys. Drain/reissue pending email and follow a reviewed key-rotation procedure; this phase does not claim a multi-key rotation system. Production SMTP/sender, HTTPS origin, registered operator, hosting, and approved policies remain unprovided launch inputs.

## Migrations, seed, and verification

```sh
pnpm env:init
pnpm infra:up
pnpm db:generate
pnpm db:deploy
pnpm env:init --seed
pnpm db:seed
pnpm check
pnpm test:integration
pnpm test:ui
```

Seed refuses production/nonlocal databases and requires explicit `.test` credentials. It is idempotent and does not overwrite existing passwords or memberships. `env:init --seed` provisions missing local values without printing them. No hardcoded production account exists.

Authentication API integration creates a uniquely named, isolated PostgreSQL database, deploys the actual migration, uses real Redis and SMTP/Mailpit, and drops only that owned database afterward. The database test role therefore needs CREATEDB locally/CI. Tests refuse production and nonlocal database hosts. Redis keys are isolated in a test namespace and expire naturally. Browser auth tests use unique local `.test` users and delete only their own records/audits after delivery work settles.

Coverage includes canonical registration, Argon2id, generic responses, safe invalid input, CSRF, actual email delivery/retry, single-use/expired/replaced tokens, concurrent token consumption, session restart/rotation/expiration/logout, full password-reset revocation, safe profile ownership, disabled accounts, Redis rate limits, tenant/role isolation, cryptographic tampering, production cookie flags/configuration, English/Arabic forms, themes, mobile/desktop accessibility, and browser cookie/storage behavior. Actual executed results and host limitations are recorded in PROJECT_STATE, not inferred from this coverage list.
