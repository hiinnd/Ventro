# Dynamic registration

Phase 8 persists a per-event `RegistrationForm`, ordered `FormField` records, `Registration`, and `RegistrationAnswer`. Form schemas are validated server-side: keys are unique, choice fields require options, and conditional rules must refer to known fields.

Registration submission validates the published public event and published form inside a database transaction. The event row is locked with `FOR UPDATE` before the registration deadline and confirmed-capacity count are read. The database has a unique `(eventId, userId)` constraint; this and the lock prevent duplicate registrations and capacity overbooking under concurrent requests.

Answers are validated only against visible form fields. Required text, email, number, date, consent, select/radio and checkbox values are all enforced on the backend. Organizer reads remain tenant-authorized through the event's organization, while an attendee can retrieve only their own registrations.

## Confirmation, ticket, and email

VENTRO supports two explicit paths. **Guest registration** requires the attendee's name and email but no session; it creates an accountless registration and delivers the ticket/QR by email. **VENTRO Account registration** requires a verified session; it links the registration to that account so its tickets, certificates, and Event Passport remain available together. Existing session-based clients default to the account path for compatibility; anonymous requests must explicitly choose `GUEST`.

Every successful registration transaction creates its ticket. Account registration also records an in-app `REGISTRATION_CONFIRMED` notification and a preference-aware encrypted `EmailOutbox` entry. A guest has no account notification or account ticket page: the confirmation screen accurately tells them to retain the email. An account attendee can immediately open their ticket and QR code at `/[locale]/tickets`.

The localized EN/AR confirmation email has the event, date/time, location type, and an inline QR image. Account emails add an account-ticket link; guest emails intentionally do not contain account access. Its QR payload is only the ticket's opaque UUID credential (`ventro:ticket:<credential>`): it contains no attendee name, email, or other personal data. The credential is still checked server-side by the authorized check-in flow. If an account holder disables `NotificationPreference.registrationEmail`, the ticket remains available in the account but no email is queued; guest tickets always queue their delivery email.

Development delivery uses Mailpit. The existing leased SMTP outbox worker retries transient delivery failures and clears encrypted payload material after successful handoff. A production SMTP provider/domain is still an operational configuration requirement; a queued local email is not represented as a real external delivery.
