# syntax=docker/dockerfile:1.7

FROM rust:1.88-slim-bookworm AS wasm-builder

RUN rustup target add wasm32-unknown-unknown \
    && cargo install wasm-pack --version 0.13.1 --locked
WORKDIR /engine
COPY src/lib/engine/Cargo.toml src/lib/engine/Cargo.lock ./
COPY src/lib/engine/src ./src

RUN wasm-pack build --target web --out-dir pkg --release

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

# Copy pre-built WASM artefacts into the engine directory
COPY --from=wasm-builder /engine/pkg ./src/lib/engine/pkg

# Keep a separate copy so bind-mounted ./src doesn't shadow the build
COPY --from=wasm-builder /engine/pkg /wasm-cache/pkg

CMD ["node", "--version"]
