# Nurse Care web — Vite build + nginx (proxies /api and /socket.io to backend)
# Build context is the repo root (see docker-compose.yml) because this depends on the
# local ../packages/shared workspace package (file:../packages/shared in package.json).
FROM node:20-alpine AS build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
COPY packages/shared /packages/shared
RUN npm ci

COPY frontend/. .

# Same-origin API in production, namespaced under /healthcare (nginx proxies /healthcare/api → backend)
ARG VITE_API_URL=/healthcare/api
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_SOCKET_PATH=/healthcare/socket.io
ENV VITE_SOCKET_PATH=$VITE_SOCKET_PATH

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1
