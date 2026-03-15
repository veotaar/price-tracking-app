FROM oven/bun:1.3.10 AS base

WORKDIR /app

FROM base AS prepare

COPY . .

RUN bunx turbo prune @repo/api-public --docker

FROM base AS deps

COPY --from=prepare /app/out/json/ ./

RUN bun install --frozen-lockfile

FROM deps AS builder

COPY --from=prepare /app/out/full/ ./

WORKDIR /app/apps/api-public

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	src/index.ts

FROM oven/bun:1.3.10-slim AS runner

WORKDIR /app

COPY --from=builder /app/apps/api-public/server ./server

RUN chmod +x ./server

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["./server"]