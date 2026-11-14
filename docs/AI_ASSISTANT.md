# Optional event assistant

The Events organizer workspace includes description, agenda, registration question,
anonymized feedback summary and planning tools. All output is labeled AI-generated.
The organizer edits and explicitly approves the draft before copying it; this module
cannot publish or mutate an event, form, agenda or participant record.

## Configuration

Default: disabled. Set server-only AI_PROVIDER=anthropic, AI_API_KEY and AI_MODEL to
a model available in your provider account, then restart the API. Never put the key
in a NEXT_PUBLIC variable or commit it. Missing key/model keeps the feature disabled.
No provider key was supplied during implementation; a live paid-provider test remains
required before enabling this feature for production.

AiProvider is the injectable boundary. AnthropicProvider implements the Messages
protocol at a fixed HTTPS URL with redirects forbidden and a 25-second timeout.
Reference: https://platform.claude.com/docs/en/api/messages/create
Requests cap output at 1,500 tokens, reject incomplete outputs and expose only safe
errors. No SDK or additional runtime dependency was added.

## Privacy and limits

Only the organizer's typed brief and task/language are transmitted. No database
participant records, emails, answers, tickets or account identifiers are included.
The user must confirm authorization and removal of personal data. Obvious email and
phone patterns are rejected, but this heuristic cannot identify names or every kind
of personal information: manual anonymization remains required. Prompts/results are
not persisted or logged by this module. Provider retention/processing terms must be
reviewed by the operator before enabling it.

Every request revalidates membership and events:write permission. OWNER and
EVENT_MANAGER are eligible; other roles and unrelated tenants are denied. CSRF,
session and email-verification guards apply. Redis atomically counts attempts per
organization per UTC date; AI_DAILY_LIMIT defaults to 20. Failures count to bound
retry spending, and Redis failure denies generation. Input is bounded to 6,000
characters. Production Redis should retain counters across restarts and avoid
evicting them. Limits are request caps, not currency budgets.

The frontend treats output as plain text; no HTML rendering, tool execution or
automatic application is allowed. Review confirmation resets on each generation/edit.
An approved draft must still pass existing organizer publishing validation.

## Verification

API tests use an explicitly mocked HTTP provider: disabled state, permission denial,
privacy validation, quota exhaustion, Redis outage, safe failure messages, DTO bounds
and adapter response handling. They do not demonstrate real model quality.
An actual credential/model is needed to complete the live-provider acceptance test.
Phases 12 and 13 retain their earlier incomplete status.
