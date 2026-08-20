# System Design Write-up — Healthcare Appointment & Follow-up Manager

**Word count: ~800**

---

## 1. Double-Booking Prevention

The slot-booking system faces a classic TOCTOU (time-of-check to time-of-use) race: two concurrent clients read "slot available", both attempt to insert, and both succeed — creating a double-booking.

We eliminate this with **two defence layers**:

**Layer 1 — Database UNIQUE constraint.** The `appointments` table enforces `UNIQUE(doctor_id, slot_start)` at the Postgres level. This is the definitive guard. No matter how many application nodes are running, Postgres serialises the insert and rejects the second attempt with error code `23505` (unique_violation).

**Layer 2 — Application transaction.** The `POST /appointments/hold` endpoint wraps its logic in a Prisma transaction that (a) checks existing `held|confirmed` rows for the slot and (b) inserts the new `held` row atomically. If the DB constraint fires, the application catches it and returns a clean `409 Slot no longer available` — never a raw 500.

The integration test (`tests/concurrency.test.js`) fires two simultaneous `supertest` requests for the same doctor + slot and asserts exactly one `201` and one `409`, then queries the DB to verify exactly one held row exists.

---

## 2. Doctor Leave Conflict Handling

When an admin marks a doctor as on leave for a given date, confirmed appointments on that date must be cancelled and patients notified — but the leave creation response must not block on email/calendar delivery.

**Implementation:**

1. **Single DB transaction** (Prisma `$transaction`):
   - Upsert the `doctor_leave` row.
   - Bulk-update all `confirmed` appointments with `slotStart` on that date to `status = doctor_leave_cancelled`.

2. **After the transaction commits**: iterate the affected appointments and call `enqueueNotification()` for each patient. This writes a `notifications` row and adds a BullMQ job — it never performs I/O synchronously in the request handler.

3. The leave-creation endpoint responds immediately with the count of affected appointments. Email and calendar delete operations happen asynchronously.

This design means a Google API outage or SMTP timeout on a busy day cannot cause the leave-creation API call to fail or hang.

---

## 3. The Slot-Hold Mechanism

Direct "click → confirm" booking would still suffer from double-bookings if the user needs to fill in a form between selecting a slot and confirming. We use a **timed hold** pattern:

1. **Hold** (`POST /appointments/hold`): inserts an `appointments` row with `status='held'` and `hold_expires_at = now() + 5 minutes`. The DB constraint prevents anyone else from holding the same slot.

2. **Symptoms** (`POST /appointments/:id/symptoms`): patient submits free-text, which triggers the pre-visit LLM asynchronously. If the hold has expired (checked at application level), the endpoint returns `410 Gone`.

3. **Confirm** (`POST /appointments/:id/confirm`): flips status to `confirmed` and enqueues email + calendar notifications.

4. **Cleanup job**: a BullMQ repeatable job runs every 60 seconds and deletes all `held` rows where `hold_expires_at < now()`. This returns the slot to the available pool for other patients.

The 5-minute window is deliberately short to minimise ghost reservations. The front-end shows a countdown timer and redirects the user to "Start Over" on expiry.

---

## 4. Notification Failure Handling

No email or calendar call is ever made synchronously from a request handler. Every notification flows through this pipeline:

**Write → Queue → Worker → Retry → Surface**

1. **Write**: `enqueueNotification()` creates a `notifications` table row (`status='pending'`) before adding the BullMQ job. This gives the admin dashboard visibility into every notification attempt, including those where Redis went down before the job was queued.

2. **Queue**: BullMQ job carries only the `notificationId`. The worker fetches the full payload from Postgres, which is the source of truth.

3. **Worker** (`src/jobs/workers.js`): sends email via Nodemailer or calendar event via Google API. On success, sets `status='sent'`.

4. **Retry with exponential backoff**: On failure, the worker increments `attempts`, sets `status='retrying'`, and re-enqueues with a delay:
   - Attempt 1 → 1 min delay
   - Attempt 2 → 5 min delay
   - Attempt 3+ → 30 min delay
   - After 5 attempts → `status='failed'`, no further retries.

5. **Admin visibility**: `GET /admin/notifications?status=failed` surfaces all permanently failed notifications. Admins can trigger manual retry via `POST /admin/notifications/:id/retry`, which resets `attempts=0` and re-enqueues.

This design ensures that a transient SMTP outage (e.g., Gmail rate-limiting) does not permanently lose a booking confirmation — it will be delivered within 36 minutes in the worst case. A permanent API failure (wrong credentials, deactivated account) surfaces cleanly on the admin dashboard rather than silently failing.

---

## LLM Integration Summary

The `callLLM()` helper uses **Gemini 2.5 Flash** as primary (native JSON output mode) and **Groq llama-3.3-70b-versatile** as fallback. Zod schemas validate both responses. If both fail, the function returns `{ status: 'failed', data: null }` — the surrounding request continues normally, showing an "AI summary unavailable" badge to the doctor rather than blocking the appointment.

Medication reminders are parsed from prescription `frequency` strings into concrete datetime occurrences (e.g., "twice daily" → 8:00 AM + 8:00 PM for N days) and each becomes a separate scheduled BullMQ job with the same retry semantics as booking notifications.
