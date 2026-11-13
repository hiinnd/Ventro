# Dynamic registration

Phase 8 persists a per-event `RegistrationForm`, ordered `FormField` records, `Registration`, and `RegistrationAnswer`. Form schemas are validated server-side: keys are unique, choice fields require options, and conditional rules must refer to known fields.

Registration submission validates the published public event and published form inside a database transaction. The event row is locked with `FOR UPDATE` before the registration deadline and confirmed-capacity count are read. The database has a unique `(eventId, userId)` constraint; this and the lock prevent duplicate registrations and capacity overbooking under concurrent requests.

Answers are validated only against visible form fields. Required text, email, number, date, consent, select/radio and checkbox values are all enforced on the backend. Organizer reads remain tenant-authorized through the event's organization, while an attendee can retrieve only their own registrations.
