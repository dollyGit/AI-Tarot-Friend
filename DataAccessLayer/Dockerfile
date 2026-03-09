# ── Stage 1: Build ───────────────────────────────────────
FROM golang:1.22-alpine AS builder
WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /dal-server ./cmd/dal-server

# ── Stage 2: Production ─────────────────────────────────
FROM alpine:3.19
WORKDIR /app

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /dal-server .
COPY --from=builder /app/configs ./configs

USER appuser

EXPOSE 4000 4001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4001/health || exit 1

CMD ["./dal-server"]
