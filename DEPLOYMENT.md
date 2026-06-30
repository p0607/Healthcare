# Nurse Care — Deployment Guide

Production layout: **Azure PostgreSQL** (database) + **Docker** (API + web) + **EAS Build** (mobile apps).

```
                    ┌─────────────────┐
  Mobile apps ─────►│  HTTPS domain   │◄───── Web browsers
  (iOS/Android)   │  your-domain.com │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │  Docker: nursecare-web      │
              │  (nginx + React static)     │
              │  /api/*  /socket.io/*       │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │  Docker: nursecare-api      │
              │  Express + Socket.IO        │
              └──────────────┬──────────────┘
                             │
              ┌──────────────┴──────────────┐
              │  Azure Database for         │
              │  PostgreSQL (Flexible)      │
              └─────────────────────────────┘
```

Mobile does **not** run in Docker. It is built with **Expo EAS** and talks to the same public HTTPS API.

---

## First-time checklist (local + Azure + mobile)

Use this while Docker Desktop / store accounts are still being set up. You can develop **locally today** without any paid mobile accounts.

### A) What you need — summary

| Item | Required when | Cost | Status in this repo |
|------|----------------|------|---------------------|
| **PostgreSQL** (local or Azure) | Always | Azure: ~$15–40/mo B1ms | ✅ Local DB ready; Azure script in `backend/scripts/` |
| **Node.js 20+** | Dev | Free | Install on PC |
| **Backend `.env`** | Dev | Free | ✅ `backend/.env` |
| **Root `.env`** (Docker) | Docker deploy | Free | Run `scripts/setup-local-env.ps1` |
| **Docker Desktop** | Docker test/deploy | Free (personal) | Install when ready |
| **Web server / Azure** | Production web | Your existing server | ✅ Dockerfiles ready |
| **HTTPS domain** | Production mobile + web | Domain + cert | Required before store builds |
| **Android Studio + emulator** | Mobile dev | Free | For testing patient + nurse flows |
| **Expo account** | Mobile dev | Free | Sign up at expo.dev |
| **EAS CLI** | APK/IPA builds | Free tier; paid for more builds | `npm i -g eas-cli` |
| **Google Play Console** | Publish on Play Store | **$25 one-time** | Not needed for internal APK |
| **Apple Developer Program** | Publish on App Store / TestFlight | **$99/year** | Not needed for Android-only |

**No purchase required** to develop and test on Android emulator or sideload a preview APK.

### B) Local development (works now — no Docker required)

**Terminal 1 — API**

```powershell
cd backend
npm run dev
```

**Terminal 2 — Web (optional)**

```powershell
cd frontend
npm run dev
```

**Terminal 3 — Mobile**

```powershell
cd mobile
npm run env:emulator          # writes .env for Android emulator
npm start
# Press 'a' for Android emulator
```

| Client | URL |
|--------|-----|
| Web (Vite) | http://localhost:5173 |
| API | http://localhost:5050/api/health |
| Mobile emulator | Uses `10.0.2.2:5050` via `mobile/.env` |

**Physical phone on same Wi‑Fi:**

```powershell
cd mobile
npm run env:phone             # auto-detects PC LAN IP
npm start
```

Allow port **5050** in Windows Firewall if the phone cannot connect.

### C) Local Docker (when Docker Desktop is installed)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-local-env.ps1
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web | http://localhost:8080 |
| API | http://localhost:5050/api/health |

Mobile still talks to **5050 on your PC** (not 8080): keep `mobile/.env` pointing at `10.0.2.2:5050` or your LAN IP.

### D) Production (Azure + your web server)

1. Azure PostgreSQL → set `DATABASE_URL` in root `.env` (see `.env.production.example`)
2. Deploy API + web via Docker to Azure Container Apps or your VM
3. HTTPS domain → nginx serves web and proxies `/api` + `/socket.io`
4. Update `CLIENT_ORIGIN` to your HTTPS web URL
5. Run once from PC: `cd backend && npm run db:init:seed` (against Azure DB)

### E) Mobile builds (Expo EAS)

**One-time setup:**

```powershell
npm i -g eas-cli
cd mobile
eas login
eas init                      # links project; adds projectId to app.json
```

Edit `mobile/eas.json` — replace `YOUR-DOMAIN.com` with your HTTPS domain.

**Internal test APK (no Play Store):**

```powershell
eas build --platform android --profile preview
```

Download APK from expo.dev and install on devices.

**Store release (requires purchases):**

| Store | Account | Fee |
|-------|---------|-----|
| Google Play | Play Console | $25 one-time |
| Apple App Store | Apple Developer | $99/year |

```powershell
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android --profile production
```

**Important:** `EXPO_PUBLIC_*` URLs are fixed at **build time**. Rebuild the app whenever the API domain changes.

### F) Demo logins (after seed)

| Role | Email | Password |
|------|-------|----------|
| Patient | user@demo.com | user1234 |
| Nurse | priya@nurse.com | nurse123 |
| Admin | admin@alchemy.com | admin123 |

---

## 1. Azure PostgreSQL setup

1. Azure Portal → **Create Azure Database for PostgreSQL Flexible Server**
2. Choose region near your users, PostgreSQL **16**, tier as needed (Burstable B1ms for dev)
3. Set admin user + strong password
4. **Networking**: allow Azure services; add your dev IP; for production add Container App outbound IPs or use private networking
5. Create database: `nurse_care`

**Connection string** (Prisma):

```text
postgresql://ADMIN_USER@SERVER_NAME:PASSWORD@SERVER_NAME.postgres.database.azure.com:5432/nurse_care?sslmode=require
```

- Username on Azure is `user@servername` (include `@servername` in the user part)
- URL-encode special characters in the password (`@` → `%40`, `#` → `%23`)

6. Store this as `DATABASE_URL` in Azure Key Vault or container secrets — never commit it.

**Optional — Azure CLI script** (creates server + `nurse_care` database):

```powershell
cd backend
.\scripts\azure-create-postgres.ps1 `
  -ResourceGroup "nursecare-rg" `
  -Location "centralindia" `
  -ServerName "nursecare-db" `
  -AdminUser "nursecareadmin" `
  -AdminPassword "YourStrongP@ssw0rd!"
```

### Apply schema and seed data

After `DATABASE_URL` is set (local or Azure):

```powershell
cd backend
npm run db:init:seed
```

| Command | Purpose |
|---------|---------|
| `npm run db:setup` | Interactive — prompts for host/user/password, writes `backend/.env` |
| `npm run db:init` | Create DB (local only) + `prisma db push` |
| `npm run db:init:seed` | Same as above + demo users & catalog |
| `npm run seed` | Insert demo data only (idempotent) |
| `npm run db:reset` | **Dev only** — drop all tables, re-push schema, seed |

Local SQL alternative (superuser):

```powershell
psql -U postgres -f backend/scripts/sql/01-create-database.sql
cd backend && npm run db:init:seed
```

Docker first deploy with demo data: set `SEED_ON_START=1` in `.env` (one-time).

---

## 2. Environment variables

Copy `.env.production.example` → `.env` at repo root for Docker Compose.

| Variable | Where | Purpose |
|----------|--------|---------|
| `DATABASE_URL` | API container | Azure Postgres |
| `JWT_SECRET` | API container | Auth tokens (32+ random chars) |
| `JWT_EXPIRES_IN` | API container | e.g. `7d` |
| `CLIENT_ORIGIN` | API container | Web URL(s), comma-separated — CORS + Socket.IO |
| `PORT` | API container | `5050` (default) |
| `VITE_API_URL` | Web build | `/api` when nginx proxies (default in Docker) |
| `EXPO_PUBLIC_API_URL` | Mobile EAS build | `https://your-domain.com/api` |
| `EXPO_PUBLIC_SOCKET_URL` | Mobile EAS build | `https://your-domain.com` |

---

## 3. Docker — local production test

**Prerequisites:** Docker Desktop, Azure `DATABASE_URL` in `.env`

```powershell
cd "Nurse Care"
copy .env.production.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN=http://localhost:8080

docker compose up --build
```

| Service | URL |
|---------|-----|
| Web (patient/nurse/admin UI) | http://localhost:8080 |
| API health | http://localhost:5050/api/health |

**First-time data** (run once against Azure DB from your PC):

```powershell
cd backend
# use same DATABASE_URL in backend/.env
npm run setup
```

Or seed only: `npm run seed`

---

## 4. Deploy Docker to Azure

Common options:

### A) Azure Container Apps (recommended)

1. Push images to **Azure Container Registry (ACR)**
2. Create Container App for **api** (port 5050, env from secrets)
3. Create Container App for **web** (port 80) — or use **one** app with both if you merge nginx+api in one image (current setup uses two services)
4. Custom domain + **HTTPS** (required for mobile + secure cookies)
5. Set `CLIENT_ORIGIN=https://your-domain.com`

Build & push example:

```powershell
az acr login --name yourregistry
docker build -t yourregistry.azurecr.io/nursecare-api:latest ./backend
docker build -t yourregistry.azurecr.io/nursecare-web:latest ./frontend
docker push yourregistry.azurecr.io/nursecare-api:latest
docker push yourregistry.azurecr.io/nursecare-web:latest
```

Internal networking: web container must reach API at `http://api:5050` — in Container Apps use internal ingress name or configure nginx `proxy_pass` to the API app's internal FQDN.

### B) Azure VM + Docker Compose

1. Ubuntu VM with Docker installed
2. Clone repo, configure `.env`, `docker compose up -d`
3. Put **Azure Application Gateway** or **nginx** + Let's Encrypt in front for HTTPS

---

## 5. HTTPS and domains (required)

- **Web**: `https://app.yourcompany.com` → web container
- **API** (if split): `https://api.yourcompany.com` — optional if nginx proxies `/api` on same domain
- **Mobile** must use **HTTPS** URLs in `EXPO_PUBLIC_*`

Update:

- `CLIENT_ORIGIN=https://app.yourcompany.com`
- `mobile/eas.json` → production env URLs
- Azure Postgres firewall → allow container outbound IPs

---

## 6. Mobile app (Expo EAS)

Mobile is distributed as **APK/IPA**, not Docker.

1. Install EAS CLI: `npm i -g eas-cli`
2. Login: `eas login`
3. Configure `mobile/eas.json` with your production URLs
4. Build:

```powershell
cd mobile
eas build --platform android --profile production
eas build --platform ios --profile production
```

5. Submit to stores: `eas submit`

**Important:** `EXPO_PUBLIC_*` values are baked at **build time**. Rebuild the app whenever the API domain changes.

For internal testing: `eas build --profile preview` → install APK on devices.

---

## 7. Multi-device usage in production

| Client | How it connects |
|--------|-----------------|
| Web | Browser → `https://your-domain.com` |
| Android/iOS | Installed app → `EXPO_PUBLIC_API_URL` |
| Live tracking | Socket.IO on same host as API (`/socket.io`) |
| OTP visits | Works without GPS; patient sees OTP in Bookings |

All clients share one API + one Azure database.

---

## 8. Security checklist before go-live

Implemented in the codebase:

| Control | Where |
|---------|--------|
| Helmet HTTP headers | `backend/src/app.js` |
| Rate limits (login, register, OTP, public API) | `backend/src/middleware/rateLimit.js` |
| Production env validation | `backend/src/config/env.js` |
| CORS locked to `CLIENT_ORIGIN` (no `*` in prod) | `backend/src/app.js` |
| Socket `request:join` authorization | `backend/src/socket.js` |
| Nurse location only for owned requests | `backend/src/socket.js` |
| OTP in Postgres with attempt limits | `VisitOtp` model + `backend/src/lib/visitOtp.js` |
| Password min 8 characters | `backend/src/lib/password.js` |
| Deactivated accounts blocked | `backend/src/middleware/auth.js` |
| nginx security headers | `frontend/nginx.conf` |

Before go-live, verify:

- [ ] Strong `JWT_SECRET` (32+ chars) in Azure Key Vault / secrets — not the dev placeholder
- [ ] `DATABASE_URL` not in git
- [ ] HTTPS everywhere (web + API domain)
- [ ] `CLIENT_ORIGIN` set to exact **HTTPS** web origins (required in production)
- [ ] Azure Postgres firewall locked to server outbound IPs only
- [ ] Remove or reset demo seed account passwords
- [ ] Enable Azure Postgres automated backups
- [ ] Monitoring / alerts on `/api/health`
- [ ] Enable HSTS in nginx when TLS terminates at your reverse proxy (see comment in `nginx.conf`)
- [ ] Integrate real payment gateway before accepting money (`paymentConfirmed` is demo-only today)
- [ ] Switch from `prisma db push` to versioned migrations for production schema changes

Rate limit defaults (per IP):

| Endpoint | Limit |
|----------|-------|
| Login | 10 / 15 min |
| Register | 5 / hour |
| Check patient email | 20 / 15 min |
| OTP send/verify | 6 / 10 min |
| Public catalog / nurse search | 60 / min |

---

## 9. Schema migrations (recommended next step)

Today the API container runs `prisma db push` on startup. For production teams, switch to versioned migrations:

```powershell
cd backend
npx prisma migrate dev --name init
# CI/CD: prisma migrate deploy
```

Update `backend/scripts/docker-entrypoint.sh` to use `migrate deploy` instead of `db push`.

---

## 10. Troubleshooting

| Issue | Fix |
|-------|-----|
| API can't connect to Azure DB | Check firewall, `sslmode=require`, URL-encoded password |
| Web login works, Socket fails | Ensure nginx proxies `/socket.io` with WebSocket headers |
| Mobile network error | Rebuild app with correct `EXPO_PUBLIC_*`; use HTTPS |
| CORS error on web | Add exact web URL to `CLIENT_ORIGIN` |
| Empty caregivers | Nurses must be online + within 25 km of patient address |

---

## Quick reference — files added for deployment

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Run API + web locally / on VM |
| `.env.production.example` | Root env template |
| `backend/Dockerfile` | API image |
| `frontend/Dockerfile` | Web image (Vite + nginx) |
| `frontend/nginx.conf` | SPA + API + Socket.IO proxy |
| `mobile/eas.json` | Mobile production build config |
