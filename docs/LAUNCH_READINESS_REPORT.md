# Phase 16 launch-readiness report

**Status: NOT READY FOR PUBLIC LAUNCH.** No production deployment, custom domain, payment integration, or real-world access was performed or confirmed.

## Technical status

The local QA suite, strict typing, linting, production builds, migrations, unit tests, integration tests, and focused browser regressions passed as recorded in [QA_REPORT.md](QA_REPORT.md). The audit also found a material mobile-performance gap and unconfigured production operations. Therefore Phase 16 is preparation/documentation only.

## Open launch gates

1. Fix and re-measure mobile performance/Arabic CLS against an agreed budget.
2. Finish Phase 12 notification delivery and preference experiences; verify retries with Mailpit/staging SMTP.
3. Finish or formally scope-defer Phase 13 administration/billing. Payments stay off.
4. Complete the deployment, security, privacy, backup/restore, monitoring, and incident requirements in the companion documents.
5. Approve legal operator/contact/policies, support process, pricing/terms if offered, and external security review.

## Controlled Jordan university-workshop pilot

### Goal

Validate organizer onboarding, event creation/publishing, participant registration, QR check-in, live engagement, certificate generation, and feedback in a limited real setting—not a public commercial launch.

### Scope and safeguards

- One named university/workshop partner, one organization, one training event, a small pre-agreed participant cap, named check-in staff, and a tested manual fallback list.
- Separate pilot/staging environment, pilot-only email sender, HTTPS domain, managed backups, staff access only, and no real payments.
- Explain participant data use, Passport visibility, certificate verification, and feedback collection before registration. Collect the minimum data.
- Rehearse organizer creation, registration deadline/capacity, ticket display, revoked-ticket denial, offline/manual fallback, polls/Q&A moderation, certificate eligibility, and support escalation.

### Success measures

- Organizer completes onboarding and publishes without engineering intervention.
- Sample participants complete registration and receive a valid ticket.
- Staff accept each valid QR only once and reject invalid/revoked tickets.
- Authorized participants can vote/ask questions; unauthorized event-room access is rejected.
- Eligible attendees receive a verifiable certificate; Passport privacy settings behave as selected.
- Capture organizer/staff/participant usability feedback and prioritize defects before expanding access.

### Pilot exit decision

The product owner, engineering owner, privacy owner, and workshop partner review incidents, support load, conversion/completion, performance, accessibility, and feedback. Public launch is a separate decision after all critical issues are resolved or explicitly accepted.
