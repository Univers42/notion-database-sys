# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json eslint.config.js ./
COPY packages/api/package.json packages/api/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/types/package.json packages/types/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY packages ./packages

RUN pnpm turbo run build --filter='./packages/*'

COPY src ./src
COPY playground ./playground
COPY docker/services/dbms ./docker/services/dbms
COPY scripts ./scripts

CMD ["node", "--version"]
