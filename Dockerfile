# ---------- Base ----------
FROM node:20-alpine AS base
WORKDIR /app

# ---------- Dependencies ----------
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---------- Builder ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN yarn build

# ---------- Production ----------
FROM node:20-alpine AS production

WORKDIR /app

RUN apk add --no-cache netcat-openbsd

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
COPY prisma.config.ts ./
COPY docker-entrypoint.sh ./

EXPOSE 3000

CMD ["sh", "docker-entrypoint.sh"]
