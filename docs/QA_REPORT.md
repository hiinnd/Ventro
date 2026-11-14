# Phase 15 quality-assurance report

**Audit date:** 2026-11-15 (Asia/Amman)  
**Verdict:** **not production-ready; do not launch.**

This report records local, observed results only. PostgreSQL, Redis, and Mailpit were running on loopback. No production service, domain, payment provider, or real user data was used.

## Automated verification

| Check                                  | Actual result                                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                    | Passed after formatting existing modified files.                                                                                                                                                                                                                                                               |
| `pnpm lint`                            | Passed with zero warnings.                                                                                                                                                                                                                                                                                     |
| `pnpm typecheck`                       | Passed across all workspaces.                                                                                                                                                                                                                                                                                  |
| `pnpm build`                           | Passed: NestJS build and optimized Next.js build.                                                                                                                                                                                                                                                              |
| `pnpm test`                            | Passed: 5 API files / 29 tests; 3 web files / 15 tests.                                                                                                                                                                                                                                                        |
| `pnpm test:integration`                | Passed: 4 files / 42 tests in 127.13 seconds.                                                                                                                                                                                                                                                                  |
| `pnpm db:deploy`                       | Passed: 8 migrations discovered; no pending migrations.                                                                                                                                                                                                                                                        |
| Playwright                             | Initial complete run: 31 passed, 1 accessibility failure, 3 skipped after serial failure. The failure was fixed. Targeted reruns then passed the desktop dashboard, Arabic mobile dashboard, loading/error recovery, and tenant-role revocation tests. The earlier 31 non-dashboard scenarios remained passed. |
| Lighthouse on production Next.js build | Completed; see Performance.                                                                                                                                                                                                                                                                                    |

The integration suite exercises registration capacity and duplicate protection, event lifecycle, ticket/check-in duplication, live polling/Q&A and Socket.IO authorization, certificate/PDF eligibility, verification, and Passport privacy. Browser coverage exercises login/recovery, organization creation and tenant isolation, RTL/LTR, themes, keyboard/reduced-motion behavior, public routes, live room/presenter, and organizer flows.

## Fixes made during QA

- Corrected WCAG 2.5.3 label/content mismatch on the organization switcher and workspace search trigger. The switcher retains an explicit screen-reader action description without hiding its visible label.
- Updated stale dashboard tests so only genuinely unavailable sections are labelled `Planned`; implemented event, registration, attendee, polling, and certificate screens are no longer tested as placeholders.
- Forced Arabic dashboard number shaping with `ar-EG`; this prevents browsers with a generic `ar` fallback from displaying Latin digits in RTL metrics.

## Security review

Reviewed controls include Argon2id passwords, opaque HTTP-only sessions, DTO validation, error redaction, CORS/origin checks, tenant membership checks, organization permissions, upload validation, Redis-backed limits, authenticated Socket.IO room admission, QR token validation, transactional uniqueness, and audit records. The integration/browser suites cover cross-organization denial, role restrictions, duplicate registrations/scans/votes, and unauthorized live-room access.

Important limits:

- This is an application-code review and automated regression run, **not** an independent penetration test.
- Row-level security is not enabled; tenant isolation relies on reviewed application authorization and tests.
- Production secrets, ingress/WAF policy, object-store policy, monitoring, backups, and disaster recovery have not been configured or exercised.
- Payments are not enabled. Phase 13 billing/provider work is incomplete, so no payment can be represented as successful.

## Accessibility

Playwright with axe checks passed for the verified EN/AR light/dark, public, design-system, and dashboard scenarios after the label fix. Keyboard navigation, mobile navigation, focus restoration, form labels/error states, RTL, contrast checks, and reduced-motion paths are covered by these tests. Lighthouse accessibility scored 100 for all three audited public-page profiles.

## Performance and web quality

Lighthouse was run against `next start` on the local production build, not a deployed CDN. Results are directional rather than field Core Web Vitals:

| Profile         | Performance | Accessibility | Best practices | SEO |   LCP |      TBT |   CLS |
| --------------- | ----------: | ------------: | -------------: | --: | ----: | -------: | ----: |
| English mobile  |          69 |           100 |            100 |  69 | 3.5 s |   920 ms | 0.001 |
| English desktop |          91 |           100 |            100 |  69 | 0.7 s |   230 ms | 0.001 |
| Arabic mobile   |          48 |           100 |            100 |  69 | 3.6 s | 1,780 ms | 0.199 |

Mobile performance is a launch blocker. The audited report identifies JavaScript execution/unused JavaScript, image delivery, initial document latency, and—in Arabic—two layout shifts. SEO 69 is expected locally because indexing is deliberately disabled until an HTTPS canonical domain and approved legal details exist. Lighthouse artifacts are intentionally local under `.local/lighthouse/`.

## Release blockers

1. Reduce and re-measure mobile JavaScript work and Arabic CLS; define an approved mobile performance budget before release.
2. Complete Phase 12 notification delivery, preferences UI, retries, and Mailpit job verification.
3. Complete or explicitly defer Phase 13 billing/admin; keep payments disabled until a verified Jordan-compatible provider is integrated.
4. Complete the Phase 16 production checklist: managed services, rotated secrets, HTTPS/domain, backups/restore rehearsal, monitoring/alerting, object storage, and incident ownership.
5. Obtain legal/privacy approval, data-retention decisions, accessibility review, external security assessment, and pilot feedback.

## Next action

Use the controlled pilot described in [LAUNCH_READINESS_REPORT.md](LAUNCH_READINESS_REPORT.md) only after the blockers are resolved or formally risk-accepted by the product owner. It is not authorization to launch publicly.
