# Healthcare Appointment & Follow-up Manager

A full-stack healthcare appointment platform with patient, doctor, and admin portals. Features concurrency-safe bookings, AI-powered pre/post-visit summaries (Gemini → Groq fallback), Google Calendar sync, and reliable background notification delivery.

> **No Docker required.** Uses Neon (free cloud Postgres) and Upstash (free cloud Redis) — both have generous free tiers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (Neon free tier) + Prisma ORM |
| Frontend | React + Vite |
| Background Jobs | Redis + BullMQ |
| Auth | JWT (access + refresh) + bcrypt |
| Email | Nodemailer (Gmail SMTP) |
| Calendar | Google Calendar API v3 (service account) |
| LLM Primary | Google Gemini (`gemini-2.5-flash`, free tier) |
| LLM Fallback | Groq (`llama-3.3-70b-versatile`, free tier) |
| UI Theme | LightRays WebGL component (ogl) |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A free [Neon](https://neon.tech) account (Postgres)
- A free [Upstash](https://upstash.com) account (Redis)

### 1. Clone & Install

```bash
git clone <repo-url>
cd "Healthcare Manager"

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Set Up Cloud Services (free, no credit card)

#### Neon (PostgreSQL)
1. Sign up at [neon.tech](https://neon.tech) → Create a new project
2. Dashboard → Connection Details → copy **two** strings:
   - **Pooled connection** → `DATABASE_URL`
   - **Direct connection** → `DIRECT_URL`

#### Upstash (Redis for BullMQ)
1. Sign up at [upstash.com](https://upstash.com) → Create Redis database
2. Copy the **Redis URL** (e.g. `rediss://:token@host:port`) → `REDIS_URL`

### 3. Configure Environment

```bash
cd backend
cp .env.example .env
# Fill in: DATABASE_URL, DIRECT_URL, REDIS_URL, JWT secrets, SMTP, GEMINI_API_KEY
```

Minimal `.env` to get started:
```bash
PORT=3001
NODE_ENV=development
JWT_ACCESS_SECRET=any_long_random_string_here_32chars_min
JWT_REFRESH_SECRET=another_long_random_string_here_32chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# From Neon dashboard
DATABASE_URL="postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/db?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xyz.region.aws.neon.tech/db?sslmode=require"

# From Upstash dashboard
REDIS_URL="rediss://:your-token@us1-abc.upstash.io:6380"

# Email (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="Healthcare Manager <your@gmail.com>"

# LLM (free — get at aistudio.google.com)
GEMINI_API_KEY=your_gemini_api_key

# Admin seed credentials
ADMIN_EMAIL=admin@clinic.com
ADMIN_PASSWORD=Admin@1234
ADMIN_NAME=Super Admin

FRONTEND_URL=http://localhost:5173
```

### 4. Run Migrations & Seed

```bash
cd backend
npx prisma migrate dev --name init
npm run seed
```

### 5. Start Dev Servers

Open **two** terminals:

```bash
# Terminal 1 — Backend API (port 3001)
cd backend && npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🚀

---

## .env.example — All Required Variables

```bash
PORT=3001
NODE_ENV=development

# JWT
JWT_ACCESS_SECRET=change_me_access_secret_at_least_32_chars
JWT_REFRESH_SECRET=change_me_refresh_secret_at_least_32_chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Neon PostgreSQL (use local Docker strings for dev)
DATABASE_URL="postgresql://<user>:<pass>@<endpoint>-pooler.<region>.aws.neon.tech/<db>?sslmode=require"
DIRECT_URL="postgresql://<user>:<pass>@<endpoint>.<region>.aws.neon.tech/<db>?sslmode=require"

# Redis
REDIS_URL=redis://localhost:6379

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_16_char_app_password
EMAIL_FROM="Healthcare Manager <your_gmail@gmail.com>"

# Google Calendar (optional)
GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json
GOOGLE_CALENDAR_ID=primary

# LLM
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key   # optional fallback

# Admin seed
ADMIN_EMAIL=admin@clinic.com
ADMIN_PASSWORD=Admin@1234
ADMIN_NAME=Super Admin

# Frontend
FRONTEND_URL=http://localhost:5173
```

---

## API Reference

### Auth
| Method | Route | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register patient |
| POST | `/auth/login` | Public | Login (all roles) |
| POST | `/auth/refresh` | Public | Refresh JWT |
| GET | `/auth/me` | Any | Get current user |

### Doctors
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/doctors?specialisation=` | Public | Search doctors |
| GET | `/doctors/:id/slots?date=YYYY-MM-DD` | Public | Available slots |

### Appointments
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/appointments` | Any | List appointments (role-filtered) |
| GET | `/appointments/:id` | Any | Get single appointment |
| POST | `/appointments/hold` | Patient | **Step 1**: Hold slot (concurrency-safe) |
| POST | `/appointments/:id/symptoms` | Patient | **Step 2**: Submit symptoms + trigger LLM |
| POST | `/appointments/:id/confirm` | Patient | **Step 3**: Confirm booking |
| POST | `/appointments/:id/cancel` | Patient/Doctor/Admin | Cancel |
| POST | `/appointments/:id/reschedule` | Patient | Reschedule |
| POST | `/appointments/:id/notes` | Doctor | Submit post-visit notes + prescription |

### Admin
| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/admin/stats` | Admin | Platform statistics |
| GET | `/admin/doctors` | Admin | List all doctors |
| POST | `/admin/doctors` | Admin | Create doctor |
| PATCH | `/admin/doctors/:id` | Admin | Update doctor |
| DELETE | `/admin/doctors/:id` | Admin | Delete doctor |
| POST | `/admin/doctors/:id/leave` | Admin | Add leave day (cascade cancellation) |
| GET | `/admin/doctors/:id/leave` | Admin | List doctor leave days |
| DELETE | `/admin/doctors/:doctorId/leave/:leaveId` | Admin | Cancel leave |
| GET | `/admin/notifications?status=failed` | Admin | Failed notifications |
| POST | `/admin/notifications/:id/retry` | Admin | Manually retry notification |

---

## Database Schema

```
users               — id, email, passwordHash, name, role (patient|doctor|admin)
doctor_profiles     — id, userId, specialisation, slotDuration, timezone, bio
doctor_working_hours— id, doctorId, dayOfWeek (0-6), startTime, endTime
doctor_leave        — id, doctorId, date, reason
appointments        — id, doctorId, patientId, slotStart, slotEnd, status, holdExpiresAt
                      UNIQUE(doctorId, slotStart) ← double-booking prevention
symptom_forms       — id, appointmentId, symptoms, aiSummary (JSON), aiStatus
visit_notes         — id, appointmentId, notes, prescription (JSON), patientSummary, aiStatus
notifications       — id, appointmentId, channel, type, status, attempts, lastError, scheduledFor, payload
calendar_events     — id, appointmentId, googleEventId, syncStatus
```

---

## LLM Prompts

### Pre-Visit (symptoms → summary)
```
Analyse these symptoms and return a JSON with these exact keys:
{
  "urgency": "Low" | "Medium" | "High",
  "chiefComplaint": "string",
  "suggestedQuestions": ["string", "string", "string"]
}
Symptoms: <patient symptoms>
```

### Post-Visit (clinical notes → patient summary)
```
Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps.
Return JSON with keys: { "summary": "string", "medicationSchedule": ["string"], "followUpSteps": ["string"] }
Notes: <clinical notes>
Prescription: <drug list>
```

---

## Neon Setup (PostgreSQL)

1. Go to [neon.tech](https://neon.tech) → Create a free project
2. In Dashboard → Connection Details → Copy **Pooled connection** string → use as `DATABASE_URL`
3. Copy **Direct connection** string → use as `DIRECT_URL`
4. Run `cd backend && npx prisma migrate deploy` to apply schema

---

## Google Calendar Setup (Service Account)

1. Go to [Google Cloud Console](https://console.cloud.google.com) → Create a project
2. Enable **Google Calendar API**
3. IAM & Admin → Service Accounts → Create service account
4. Generate a JSON key → download and save as `backend/service-account.json`
5. Set `GOOGLE_SERVICE_ACCOUNT_PATH=./service-account.json` in `.env`
6. Optional: Create a clinic-wide Google Calendar → share it with the service account email as "Make changes to events" → set `GOOGLE_CALENDAR_ID` to the calendar ID

---

## Gmail SMTP Setup

1. Enable 2FA on your Google account
2. Google Account → Security → App Passwords → Generate for "Mail"
3. Copy the 16-character password → use as `SMTP_PASS` in `.env`

---

## Running Tests

```bash
# Concurrency double-booking test
cd backend
npm run test:concurrency

# All tests
npm test
```

The concurrency test fires two simultaneous hold requests for the same slot and asserts exactly one `201` and one `409`, verifying the DB UNIQUE constraint prevents double-booking.

---

## Demo Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinic.com | Admin@1234 |
| Doctor | sarah.mitchell@clinic.com | Doctor@1234 |
| Doctor | james.patel@clinic.com | Doctor@1234 |
| Doctor | priya.sharma@clinic.com | Doctor@1234 |
| Patient | alice@example.com | Patient@1234 |
| Patient | bob@example.com | Patient@1234 |

---

## Architecture Overview

```
Frontend (React/Vite :5173)
  ↓ HTTP
Backend (Express :3001)
  ├── Auth Routes     → JWT tokens
  ├── Doctor Routes   → Slot availability
  ├── Appt Routes     → Hold/Symptoms/Confirm/Cancel
  └── Admin Routes    → Doctor CRUD, Leave, Notifications
  ↓
Prisma ORM → PostgreSQL (Neon / Docker)
  ↓
BullMQ → Redis
  ↓
Workers:
  ├── Notification Worker → Nodemailer (email) / Google Calendar
  └── Cleanup Job (60s)  → Expire held appointments
  ↓
LLM Chain:
  ├── Gemini 2.5 Flash (primary)
  └── Groq llama-3.3-70b (fallback)
```

See [system-design.md](./system-design.md) for a detailed write-up on concurrency, leave handling, and notification reliability.
