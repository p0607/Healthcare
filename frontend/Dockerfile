# Nurse Care web — Vite build + nginx (proxies /api and /socket.io to backend)
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Same-origin API in production (nginx proxies /api → backend)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ || exit 1
