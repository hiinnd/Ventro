# Organizations and authorization

Phase 5 adds organization profiles, private logos, teams, invitations, session-scoped switching, and RBAC. Event creation, event staffing assignments, registration, attendance and ticketing remain separate phases. A Check-in Staff role here does not expose a check-in operation.

## Permission policy

All organization endpoints require an active, verified user and a valid database-backed session. Roles belong to a membership, not to the user's account globally.

| Role               | Organization profile | Settings and logo | Team directory | Invite, assign roles, remove members |
| ------------------ | -------------------- | ----------------- | -------------- | ------------------------------------ |
| Organization Owner | Read                 | Update            | Read           | Manage all organization roles        |
| Event Manager      | Read                 | No                | Read           | No                                   |
| Check-in Staff     | Read                 | No                | No             | No                                   |
| Participant        | Read                 | No                | No             | No                                   |

`Platform Admin` is a separate global `User.platformRole`. It permits a paginated read-only organization directory with names, slugs, creation dates and real membership counts. It does not implicitly grant tenant membership, team emails, private logos or settings access. Platform administration is never an invitation/team role and cannot be submitted to registration or profile updates. Shared permission constants in `packages/types` drive the UI and service checks; hiding navigation is only a usability measure.

For local operator provisioning, an active verified account must already exist:

```sh
pnpm platform:admin --grant <existing-verified-email>
pnpm platform:admin --revoke <existing-verified-email>
```

The offline operator tool refuses production and nonlocal databases, creates no credentials, grants no tenant role, and records each change. Production bootstrap/revocation requires a reviewed trusted-operator procedure. The normal seed never creates a Platform Admin. Direct database operations must preserve the last active owner before disabling/deleting an owner.

## Authorization and concurrency

Organization IDs from URLs are selectors only. NestJS validates UUIDs, session, verification, membership, active-user/non-archived-organization status, and the exact permission. The service repeats current session/hash/credential-version/user checks inside transactions; mutations acquire a user row lock followed by the organization row lock before checking membership and writing. Reads of tenant data also go through the authorized transaction. No submitted actor ID, role claim, active-organization header or cached frontend selection grants access.

Membership changes and invite consumption serialize on the organization row. The last active owner cannot be removed or demoted through these endpoints, including concurrent owner changes. Removing an already disabled owner is allowed when the acting active owner remains. A removed member loses access on the next request and their active organization is cleared across all sessions. Demoting/removing an owner revokes their pending invitations. Existing memberships are not promoted by accepting an old/repeated invitation. A disabled user or archived organization is denied. There is no public archive/disable endpoint in this phase.

There are two explicit exceptions to ordinary membership reads: invitees may read/respond to invitations addressed to their own current verified email; authorized Platform Admins may read the limited global directory. Neither can inspect arbitrary team data.

The active organization lives on `Session`, survives renewal, and is scoped to that session. Switching verifies membership before changing it and writes an audit event. Membership/permission checks still run for the organization explicitly addressed by every request; selecting one organization does not authorize another. This supports multiple tabs without treating a mutable selection as a security boundary.

## Invitations and email

Owners can invite existing or new users to any of the four membership roles. Emails are normalized; an organization/email pair has one invitation record. Reissuing rotates a random 256-bit token, replaces role/expiry, cancels pending older delivery, and resets status. Tokens are SHA-256 hashes in the invitation table. Links use a fragment, are removed from the visible URL after capture, and never appear in query strings or JSON responses.

Invitations expire after seven days. Status is PENDING, ACCEPTED, REJECTED or REVOKED; expiration is computed from the timestamp, so no running scheduler is needed to deny an expired invite. Resolution, acceptance and rejection require the invited verified email, an unexpired pending record, an active issuer who is still an owner, and a non-archived organization. Accept/reject are explicit POSTs. Concurrent acceptance has one winner. Owners can revoke pending invitations. An accepted/rejected/revoked/expired/replaced link cannot grant access.

Recipients can use `/en/invitations` or `/ar/invitations` after login/registration/verification, even if the original fragment was lost during authentication. Login redirects accept only approved local workspace/account paths. A wrong account receives an unavailable-invitation response and no organization details from token resolution.

Email uses the existing transactional encrypted PostgreSQL outbox and actual SMTP/Mailpit. `EmailOutbox.userId` is now nullable because a recipient need not have an account; `invitationId` links these deliveries to their invitation. The encrypted payload includes the address, localized link and organization name, never plaintext in queue metadata/logs. The worker cancels obsolete/expired invitation deliveries. Delivery is at least once; stable Message-ID and single-use acceptance make duplicates safe. The frontend says queued, not delivered. SMTP failures do not discard the invitation or claim successful delivery.

## Logos and limits

Logos are stored as binary data in a separate `OrganizationLogo` table, avoiding a new object-storage service for this bounded feature. Owners upload one static PNG/JPEG/WebP up to 2 MiB through bounded multipart endpoints. Sharp decodes with a 16-million-pixel limit, rejects SVG/animated/unsupported files, strips metadata, corrects orientation and re-encodes a PNG within 384×384 and 512 KiB. PostgreSQL additionally constrains stored byte length and digest. No filesystem path, source filename, SVG script or external image URL is used for storage.

Logo reads require current membership and return `image/png`, `nosniff` and `no-store`. Next Image uses unoptimized delivery for these private authenticated images so the public optimizer cannot cache them. A digest refreshes the UI when the logo changes. Public marketing photographs retain their existing optimized delivery.

All lists paginate at 25, with validated page numbers. Initial documented caps are 20 owned organizations/user, 100 memberships/user, 250 members/organization and 100 unexpired pending invitations/organization. These are actual enforcement limits, not advertised subscription plans. Dedicated Redis action limits bound reads, writes and invitation attempts; existing shared-frontend network-bucket deployment constraints still apply. Larger teams and object storage need explicit future capacity requirements.

Organization profiles validate names, descriptions, HTTP(S) website URLs without credentials, contact email, IANA timezone and EN/AR invitation language. Slugs are unique, lowercase and immutable after creation. Organization and invitation records persist until managed deletion; this phase has no self-service organization deletion flow. Public draft privacy disclosures describe these records and team-directory visibility.

## Routes and audit

Backend `/api/v1/organizations` provides list/create, `/:id` read/update, `/:id/activate`, `/:id/logo`, `/:id/members` and member role/removal, `/:id/invitations` and revocation. Invitee routes are `/invitations`, `/invitations/resolve`, `/invitations/:id/accept` and `/reject`. The platform directory is `/api/v1/platform/organizations`. Swagger exposes these routes. Same-origin Next proxies allow only these method/path combinations, bound JSON/multipart bodies, validate successful response contracts, and enforce Origin/Host/custom-header CSRF checks for mutations. Responses are not publicly cached.

Localized pages: `/{locale}/organizations`, `/organizations/new`, `/organizations/:id/settings`, `/organizations/:id/team`, `/invitations`, `/platform`. Server Proxy rejects anonymous and unauthorized tenant/team/platform navigation before streaming, and server pages check again. Account pages link into the workspace. All workspace pages are noindex and excluded from the public sitemap.

Workspace links and private account links disable speculative Next.js prefetching. These routes validate live session/membership and should not spend rate limits or fetch private data merely because a link becomes visible. Browser test API processes use a separate Redis namespace without raising or disabling limits; production-artifact QA must also use its own namespace so earlier development traffic does not contaminate its fixed windows.

Creation/profile/logo changes, invitations, role/removal, acceptance/rejection and switching create transactional audit rows with actor, organization, request ID, keyed network hash and bounded IDs/role metadata. No raw token, recipient email, file bytes or password is included. The local platform operator tool records a system audit event. Existing audit retention remains ninety days; retention and operations require final production policy approval.

## Migration and verification

`20261113000000_organizations_rbac` adds profile fields, global role, active session organization, logo/invitation models and invitation outbox support. Existing memberships are preserved by PostgreSQL enum renames: ADMIN → EVENT_MANAGER, MEMBER → PARTICIPANT; OWNER is unchanged. No existing migration is rewritten and no production database is touched.

Real-service integration creates its own `ventro_org_it_<uuid>` database, deploys both migrations, and tests sessions, verification, tenant isolation, each role, input/CSRF, private image validation, actual invitation email, expiration/replacement/revocation, concurrent acceptance, membership removal, concurrent last-owner protection, disabled-owner removal, platform role provisioning/revocation and audit content. Its compiled API runs in a separate Node process with an ephemeral loopback port, outside Vitest instrumentation; readiness/shutdown use private process IPC. This avoids Windows native worker failures from hosting the application inside the test worker, while exercising the real application bootstrap and HTTP boundary. Browser tests create uniquely named local `.test` fixture accounts, exercise real APIs/mail, inspect English/Arabic themes/mobile/desktop with axe, and clean only their owned organizations/accounts. There is no test cleanup API. Exact executed results and host limitations are in PROJECT_STATE.

No RLS, independent penetration test, broad browser certification, production infrastructure, backups, load capacity, event logic, OAuth or MFA is claimed. Production HTTPS/SMTP, trusted ingress/client-IP abuse controls, secrets/rotation, legal operator, reviewed policies, backup/restore and a trusted Platform Admin procedure remain release dependencies.
