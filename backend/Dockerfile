FROM node:20-slim AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

FROM base AS builder

COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY src ./src

RUN npm run build

FROM node:20-slim AS production

RUN apt-get update && apt-get install -y tzdata openssl && rm -rf /var/lib/apt/lists/*
ENV TZ=Asia/Almaty

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=base /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=base /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=base /app/node_modules/.bin ./node_modules/.bin
COPY --from=base /app/node_modules/prisma ./node_modules/prisma
COPY --from=base /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main.js"]
