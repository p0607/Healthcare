# NurseCare — Hospital-Grade Healthcare at Home

A full-stack React + Node.js + **PostgreSQL**  with three role-based logins, real-time
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

Built by **Alchemy Techsol India Pvt Ltd** as a reference architecture for
on-demand healthcare apps.
