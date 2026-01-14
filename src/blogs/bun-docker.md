---
title: "Vertical Integration Wins"
date: 2025-01-12
slug: virtical-integration
---

# Vertical Integration Wins

I containerized my personal site this evening. What should've been a 1-minute task turned into a mass investigation of JavaScript tooling. It was a stark reminder that vertical integration and filling in the product gaps is how you win in 2026 as a dev tool.

---

## The Modularity Tax

Here's the Node setup I started with: TypeScript, Hono for the server, tsx to run it, Tailwind for styles. Standard stuff. Then I wrote the Dockerfile:

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable pnpm

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
RUN npx esbuild src/index.tsx --bundle --platform=node --format=esm --outfile=dist/server.mjs

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/static ./static
COPY --from=build /app/src/blogs ./src/blogs

EXPOSE 3000
CMD ["node", "dist/server.mjs"]
```

25 lines. Four stages. Three different tools (pnpm, esbuild, node). And I'm still shipping a 180MB image because I need the Node runtime.

The real kicker? I can't just run `node src/index.tsx`. Node still doesn't handle JSX. So I need esbuild to bundle it first, which means I need node_modules in the build stage, which means I need a deps stage to cache them, which means... you get it. Complexity breeding complexity.

This is the modularity tax. Every tool in the Node ecosystem does one thing well, but nobody owns the gaps between them. Docker exposes those gaps brutally.

---

## What Vertical Integration Looks Like

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install && bun run build && bun build src/index.tsx --compile --outfile=server

FROM gcr.io/distroless/base-debian12
COPY --from=build /app/server /
COPY --from=build /app/static /static
COPY --from=build /app/src/blogs /src/blogs
CMD ["/server"]
```

10 lines. Two stages. One tool.

`bun build --compile` takes my TypeScript and spits out a standalone executable. No node_modules. No runtime. Just a binary. The final image is ~25MB because I'm shipping into distroless.

This isn't magic. It's what happens when one tool owns the whole stack — package manager, bundler, transpiler, runtime. Bun can offer `--compile` because they control everything from `install` to `run`.

---

## Conclusion

This isn't about Bun. It's about where dev tools are heading.

The Node ecosystem's modularity was a strength in 2015. Mix and match the best tools! But that modularity creates churn. Every time you cross a boundary between tools, there's configuration, compatibility, and complexity.

Vertically integrated tools can optimize across those boundaries. Apple figured this out with headphones. NVIDIA figured it out with GPUs. Bun figured it out with JavaScript tooling.

In 2026, the winning dev tools won't be the ones that do one thing perfectly. They'll be the ones that own enough of the stack to eliminate the gaps entirely.
