# Event management

Phase 7 introduces organization-owned events, categories, speakers, agenda sessions, and cover media. All organizer endpoints use the authenticated session and the organization in the URL is verified against a live membership on the server; it is never accepted as a client authority claim.

`OWNER` and `EVENT_MANAGER` may create and edit drafts. Both may publish when server-side completeness and scheduling checks pass. Only an Owner may unpublish or cancel, so a published program cannot silently disappear through a lower-privilege account.

Public discovery reads only `PUBLISHED` + `PUBLIC` events. Drafts, private events, unpublished events, and cancelled events have no public representation. Every state change, duplicate, draft save, and cover update writes an organization audit entry within the corresponding transaction.

The initial cover storage follows the bounded organization-logo model: a PNG/JPEG/WebP upload is decoded, re-encoded as PNG, constrained to a 1600×900 cover and 700 KiB, then stored as bytes in PostgreSQL. Object storage can replace this bounded path later without changing event authorization.

Publishing rejects incomplete essentials, invalid dates, registration deadlines after the start, missing required venue/online location, sessions outside the event window, overlapping sessions, and session end-before-start values. Draft saving retains partial work; public visibility alone never publishes an event.
