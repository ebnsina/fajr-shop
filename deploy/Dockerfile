# One image, three entrypoints. The API, the web app and the worker are the
# same build — which is what makes splitting them a deploy change later.
FROM node:24-alpine AS base
RUN corepack enable || npm i -g pnpm@11
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/schemas/package.json packages/schemas/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# The build must not need a database: @fajr/db connects lazily for this reason.
RUN pnpm --filter @fajr/web build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app
# Never run as root.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
	CMD node -e "fetch('http://localhost:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/web/build/index.js"]
