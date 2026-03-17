FROM oven/bun:1.3.10 AS base

WORKDIR /app

FROM base AS prepare

COPY . .

RUN bunx turbo prune @repo/web-public @repo/api-public --docker

FROM base AS deps

COPY --from=prepare /app/out/json/ ./

RUN bun install --frozen-lockfile

FROM deps AS builder

COPY --from=prepare /app/out/full/ ./

WORKDIR /app/apps/web-public

ARG VITE_SENTRY_DSN=""

ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}

RUN bun run build

FROM nginx:1.29.6-alpine3.23 AS runner

COPY apps/web-public/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web-public/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]