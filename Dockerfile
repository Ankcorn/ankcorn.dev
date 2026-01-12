FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install && bun run build && bun build src/index.tsx --compile --outfile=server

FROM gcr.io/distroless/base-debian12
COPY --from=build /app/server /
COPY --from=build /app/static /static
COPY --from=build /app/src/blogs /src/blogs
CMD ["/server"]
