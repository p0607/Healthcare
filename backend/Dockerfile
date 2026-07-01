# Nurse Care API — production image (PostgreSQL on Azure, not in this container)
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl wget

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

COPY src ./src
COPY data ./data
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5050/api/health | grep -q '"ok":true' || exit 1

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
