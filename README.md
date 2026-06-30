# NurseCare — Hospital-Grade Healthcare at Home

A full-stack React + Node.js + **PostgreSQL** clone inspired by
[tez.health](https://tez.health/), with three role-based logins, real-time
notifications, and a live map.

- **Patient (`user`)** — book home care via a map-based booking flow.
- **Nurse / Doctor (`nurse`)** — receive instant call notifications; accept and serve requests.
- **Alchemy admin (`admin`)** — see every patient, nurse, and active visit on a live map.

## Tech stack

| Layer    | Stack |
| -------- | ----- |
| Frontend | React 18, Vite, React Router, Tailwind CSS, React-Leaflet (OpenStreetMap), socket.io-client, axios, react-hot-toast |
| Backend  | Node.js, Express, JWT auth, bcryptjs, Socket.io |
| Database | **PostgreSQL** via **Prisma ORM** (with bounding-box + Haversine for "nearby nurses") |
| Maps     | Free OpenStreetMap tiles via Leaflet — **no API key required** |

```
Nurse Care/
├── backend/      # Express API + Socket.io + Prisma (port 5050)
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
└── frontend/     # React (Vite) app (port 5173)
```

> ⚠️ Reminder: `npm` commands must be run **inside `backend/` or `frontend/`**.
> The repo root has no `package.json`.

---

## 1. Prerequisites

- **Node.js 18+** and **npm**
- **PostgreSQL 13+** — pick whichever option is easiest for you ↓

### A. Easiest: Neon (free serverless Postgres) — recommended

1. Sign up at [https://neon.tech](https://neon.tech) (free, no credit card).
2. Create a new project → copy the connection string. It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxx.aws.neon.tech/neondb?sslmode=require
   ```
3. Paste it as `DATABASE_URL` in `backend/.env`.

### B. Docker (local, one command)

```powershell
docker run --name nursecare-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=nurse_care -p 5432:5432 -d postgres:16
```

The default `backend/.env` already points to this:
`postgresql://postgres:postgres@127.0.0.1:5432/nurse_care`

### C. Install Postgres locally on Windows

1. Download the installer from [https://www.postgresql.org/download/windows/](https://www.postgresql.org/download/windows/).
2. During install, set the `postgres` user password to `postgres` (or update `.env` with your password).
3. Open **pgAdmin** or `psql` and run:
   ```sql
   CREATE DATABASE nurse_care;
   ```

---

## 2. Backend setup

```powershell
cd "C:\Users\PRIYANKA\OneDrive - ALCHEMY TECHSOL INDIA PVT LTD\Desktop\Embedded\Nurse Care\backend"
npm install              # also runs `prisma generate`
# edit .env if your DATABASE_URL differs from the default
npm run setup            # creates tables + seeds admin/nurses/user
npm run dev              # http://localhost:5050
```

`npm run setup` does three things in order:

1. `prisma generate` — generates the typed client
2. `prisma db push`  — creates all tables from `prisma/schema.prisma`
3. `node src/seed.js` — inserts demo users

You should see in the terminal:

```
PostgreSQL connected
API listening on http://localhost:5050
```

### Seeded credentials

| Role           | Email                | Password   |
| -------------- | -------------------- | ---------- |
| Patient        | `user@demo.com`      | `user1234` |
| Nurse          | `priya@nurse.com`    | `nurse123` |
| Doctor (nurse) | `rohan@doctor.com`   | `doctor123`|
| Alchemy admin  | `admin@alchemy.com`  | `admin123` |

---

## 3. Frontend setup (separate terminal)

```powershell
cd "C:\Users\PRIYANKA\OneDrive - ALCHEMY TECHSOL INDIA PVT LTD\Desktop\Embedded\Nurse Care\frontend"
npm install
npm run dev              # http://localhost:5173
```

Open **`http://localhost:5173`** — that's the actual app.
(Don't open `http://localhost:5050` directly — that's the JSON API.)

Vite proxies `/api` and `/socket.io` to `http://localhost:5050`, so no CORS hassle.

---

## 4. How it works

### Booking flow (real time)

1. Patient signs in, drops a pin on the map and submits a service request.
2. Backend stores it in Postgres and emits `request:new` via Socket.io to the
   `nurses` room — **every available nurse gets an instant in-app notification + audible beep**.
3. The first nurse to tap *Accept* claims it (race-safe via a conditional
   `UPDATE ... WHERE status='pending'`). Backend emits `request:taken` to other
   nurses and `request:updated` to the patient.
4. As the nurse advances status (`on_the_way` → `in_progress` → `completed`),
   the patient and admins get live updates.
5. Alchemy admins receive every event in their activity feed and live map.

### Geo-search

`GET /api/nurses?lng=...&lat=...&maxKm=25` runs:

1. A bounding-box `WHERE` (uses the indexed `lng`/`lat` columns).
2. A Haversine refinement in JS to drop corner outliers and sort by true
   distance.

For production scale, swap this for **PostGIS** + `ST_DWithin`.

---

## 5. Useful npm scripts (backend)

| Command            | What it does |
| ------------------ | ------------ |
| `npm run dev`      | Hot-reload server with nodemon |
| `npm start`        | Production start |
| `npm run db:push`  | Sync schema → Postgres (no migrations file) |
| `npm run db:studio`| Open Prisma Studio (GUI for your DB) at http://localhost:5555 |
| `npm run seed`     | Insert demo users |
| `npm run setup`    | One-shot: generate + push + seed |

---

## 6. API summary

```
POST   /api/auth/register          { name, email, password, role, ... }
POST   /api/auth/login             { email, password, role? }
GET    /api/auth/me                (Bearer token)

POST   /api/requests               (user)   create new request
GET    /api/requests/mine          (user)
POST   /api/requests/:id/cancel    (user)
POST   /api/requests/:id/rate      (user)

GET    /api/requests/pending       (nurse)
GET    /api/requests/assigned      (nurse)
POST   /api/requests/:id/accept    (nurse)
POST   /api/requests/:id/status    (nurse)  { status }

GET    /api/requests/admin/all     (admin)
GET    /api/requests/admin/stats   (admin)

GET    /api/nurses?lng&lat&maxKm   public
PUT    /api/nurses/me              (nurse)  update availability/location
GET    /api/nurses/admin/users     (admin)  ?role=user|nurse|admin
```

### Socket events

| Direction        | Event                | Payload |
| ---------------- | -------------------- | ------- |
| server → nurses  | `request:new`        | full request |
| server → nurses  | `request:taken`      | `{ id }` |
| server → user    | `request:updated`    | full request |
| server → admins  | `activity:new`       | `{ type, request }` |
| client → server  | `request:join`       | `requestId` |
| client (nurse)   | `nurse:location`     | `{ requestId, coordinates }` |

---

## 7. Troubleshooting

| Symptom | Fix |
|---|---|
| `npm error … could not read package.json` (in repo root) | You're in the wrong folder. `cd backend` or `cd frontend` first. |
| `DATABASE_URL is not set` | The `.env` file is missing — copy `.env.example` to `.env`. |
| `Cannot connect to PostgreSQL` / `ECONNREFUSED 5432` | Postgres isn't running. Start your local service, run the Docker command, or switch to Neon. |
| `password authentication failed` | Wrong username/password in `DATABASE_URL`. |
| `relation "User" does not exist` | You forgot `npm run db:push` (or `npm run setup`). |
| Login fails with "Invalid credentials" | You haven't run `npm run seed` yet. |
| Frontend "Network Error" / blank page | Backend isn't running. Both terminals must stay open. |

---

## 8. Production notes

- Set a strong `JWT_SECRET` and use HTTPS in production.
- Lock down CORS via `CLIENT_ORIGIN`.
- Use `prisma migrate deploy` with versioned migrations (instead of `db push`).
- For real geo at scale: enable **PostGIS** and switch the geo query to `ST_DWithin`.
- Add rate-limiting (e.g. `express-rate-limit`) on `/api/auth/*`.
- Build frontend (`npm run build`) and serve `dist/` behind nginx or the Express app.

---

Built by **Alchemy Techsol India Pvt Ltd** as a reference architecture for
on-demand healthcare apps.
