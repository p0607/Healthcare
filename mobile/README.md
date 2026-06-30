# Nurse Care — Mobile App (Expo / React Native)

The iOS + Android client for Nurse Care. It talks to the **same Express API** as the
web app and reuses pure business logic from `packages/shared`.

> One JavaScript codebase runs on **both Android and iOS** — Expo/React Native handles
> the platform differences for you. You only branch with `Platform.OS` for small things
> (safe areas, fonts), never separate apps.

---

## Project layout (monorepo)

```
Nurse Care/
├── backend/            Express + Prisma API (unchanged — shared by web & mobile)
├── frontend/           React + Vite web app (unchanged)
├── mobile/             👈 THIS Expo app
└── packages/
    └── shared/         Framework-agnostic logic used by web + mobile
```

`packages/shared` holds pure functions (no React, no DOM, no React Native):
caregiver grouping/matching, checkout helpers, address formatting. Fix a rule once →
both platforms get it.

---

## Requirements

- **Expo SDK 54** (React Native 0.81, React 19.1, Expo Router 6).
- **Node.js 20.19.x or newer** (required by SDK 54).
- New Architecture is enabled (`newArchEnabled: true` in `app.json`) — the default for SDK 54.

## First-time setup

### 1. Install dependencies (from the repo root)

```bash
# from "Nurse Care/" (the monorepo root)
npm install
```

This installs `mobile/` + `packages/shared` as npm workspaces. `frontend/` and
`backend/` keep their own installs — run those from their own folders as before.

> If Metro can't find `@nursecare/shared`, the `mobile/metro.config.js` already aliases
> it directly, so it works even if workspace symlinks misbehave on Windows/OneDrive.

### 2. Point the app at your backend

The phone can't use `localhost` (that's the phone itself). Use your PC's LAN IP —
your backend prints it on startup, e.g. `http://192.168.50.240:5050`.

```bash
cd mobile
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux
```

Edit `.env`:

```
EXPO_PUBLIC_API_URL=http://<YOUR-PC-LAN-IP>:5050/api
EXPO_PUBLIC_SOCKET_URL=http://<YOUR-PC-LAN-IP>:5050
```

Make sure your phone and PC are on the **same Wi-Fi**, and the backend is running
(`cd backend && npm start`).

### 3. Start the app

```bash
cd mobile
npm start
```

Then:
- **Physical phone:** install **Expo Go** (App Store / Play Store) and scan the QR code.
- **Android emulator:** press `a`.
- **iOS simulator (macOS only):** press `i`.

> If you see a dependency version warning, run `npm run fix-deps` (`expo install --fix`)
> to align native package versions with the installed Expo SDK.

---

## What's implemented (first slice)

| Area | File | Notes |
|------|------|-------|
| Secure storage | `src/storage/session.js` | Token in SecureStore (Keychain/Keystore), user in AsyncStorage |
| API client | `src/api/client.js` | Axios + async bearer token, 401 → clears session |
| Auth state | `src/context/AuthContext.jsx` | Port of the web AuthContext (login/register/logout/refresh) |
| Auth gate | `app/index.jsx`, `app/(app)/_layout.jsx` | Redirects based on session; bottom tabs |
| Login / Register | `app/(auth)/login.jsx`, `register.jsx` | Hit `/auth/login`, `/auth/register` |
| Home | `app/(app)/home.jsx` | Greeting + 4 care pillars + nearby caregivers |
| Service detail | `app/(app)/service/[pillarId].jsx` | Sub-services + highlights for a pillar |
| Book | `app/(app)/book/[serviceType].jsx` | Nearby caregivers for a bookable service type |
| Bookings | `app/(app)/bookings.jsx` | `/requests/mine`, pull-to-refresh, cancel |
| Cart | `app/(app)/cart.jsx` | Placeholder (real cart in Phase 2) |
| Profile | `app/(app)/profile.jsx` | User info + logout |
| Service catalog | `packages/shared/src/serviceCatalog.js` | Pure-data pillars/services (shared) |
| UI kit | `src/components/*` | `Screen`, `Button`, `TextField`, `PillarIcon` |
| Theme | `src/theme/theme.js` | Brand colors, spacing, radius, font sizes |

Routing uses **Expo Router** (file-based, like Next.js):
- `app/(auth)/...` → logged-out screens
- `app/(app)/...` → logged-in screens (guarded), rendered inside bottom tabs
  (Home / Bookings / Cart / Profile). `service/[pillarId]` and `book/[serviceType]`
  are pushed screens (hidden from the tab bar).

---

## How this maps to the web app

| Web (`frontend/`) | Mobile (`mobile/`) |
|---|---|
| `localStorage` | `expo-secure-store` (token) + `AsyncStorage` (user) |
| `import.meta.env.VITE_API_URL` | `process.env.EXPO_PUBLIC_API_URL` |
| `react-router-dom` | `expo-router` |
| `<div>/<button>/<input>` + Tailwind | `<View>/<Pressable>/<TextInput>` + `StyleSheet` |
| `frontend/src/lib/caregiverServices.js` etc. | `@nursecare/shared` (same code, imported) |

---

## Next things to port

1. **Booking flow** (service selection → caregiver pick → cart).
2. **BookingCartContext** — reuse the web logic; swap `localStorage` for AsyncStorage,
   keep the `GET/PUT /api/cart/me` server sync.
3. **Maps & live tracking** — `react-native-maps` + your existing route logic.
4. **Realtime** — `socket.io-client` works in RN; use `EXPO_PUBLIC_SOCKET_URL`.
5. **Push notifications** — `expo-notifications`.

When you port a screen, move any reusable non-UI helper into `packages/shared` so the
web app can use it too.
```
