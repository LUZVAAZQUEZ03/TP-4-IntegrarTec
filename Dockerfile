# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json ./
RUN pnpm install --frozen-lockfile

FROM node:${NODE_VERSION} AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm exec prisma generate
RUN pnpm run build
RUN pnpm prune --prod

FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/package.json ./package.json
USER app
EXPOSE 3000
CMD ["node", "dist/main.js"]
