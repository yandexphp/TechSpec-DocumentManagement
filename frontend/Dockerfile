FROM oven/bun:1-alpine AS base

WORKDIR /app

COPY frontend/package.json frontend/bun.lock ./
RUN bun install

FROM base AS builder

COPY frontend/ .
RUN bun run build

FROM nginx:alpine AS production

ENV TZ=Asia/Almaty

COPY --from=builder /app/dist /usr/share/nginx/html

COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
