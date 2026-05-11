# @interlace/telemetry-collector

> Reference HTTP collector for [`@interlace/telemetry`](../interlace-telemetry/) payloads. Self-hostable. Receives anonymized rule-firing batches, stores as append-only NDJSON, produces fleet-rollup reports.

## Quick start (self-hosted)

```bash
# Run the collector on :4317
npx @interlace/telemetry-collector

# In another terminal, point your devs at it:
export INTERLACE_TELEMETRY=1
export INTERLACE_TELEMETRY_ENDPOINT=http://localhost:4317/ingest

# Run any Interlace lint workflow — events flow to the collector
interlace audit src

# Roll up after a day:
npx interlace-collector-rollup --storage telemetry-events.ndjson --out reports/
```

## Endpoints

| Method | Path | What |
| :--- | :--- | :--- |
| `GET`  | `/healthz` | Liveness probe |
| `GET`  | `/policy`  | Returns `POLICY.md` (you must provide one) |
| `GET`  | `/metrics` | Prometheus-format counters |
| `POST` | `/ingest`  | Telemetry batch ingestion |

## Privacy contract (the operator's obligations)

Per the [`@interlace/telemetry` policy](../interlace-telemetry/TELEMETRY.md), any operator running this collector agrees to:

1. **Discard connection IPs within 24 hours** (the protocol doesn't include IPs; your reverse proxy may log them — turn that off).
2. **Aggregate before re-publishing** — don't release per-`sessionId` data publicly. The `rollup.md` output bucket-flags rules with < 5 sessions.
3. **Honor deletion requests** — a user submitting `?revoke=<sessionId>` (TODO: client) may request deletion of any payload they previously sent.
4. **Publish your privacy policy** at `GET /policy` — the collector serves a `POLICY.md` file from the configured path.

## Configuration (env vars)

| Var | Default | Notes |
| :--- | :--- | :--- |
| `PORT` | `4317` | HTTP port |
| `STORAGE_PATH` | `./telemetry-events.ndjson` | Where events are appended |
| `POLICY_PATH` | `./POLICY.md` | Served at `GET /policy` |
| `MAX_BATCH_SIZE_BYTES` | `262144` (256 KiB) | Rejects oversize batches |
| `ALLOW_ORIGIN` | `*` | CORS origin |

## Storage format

One JSON object per line:

```json
{
  "receivedAt": "2026-05-09T22:00:00.000Z",
  "sessionId":  "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "ts":         1715290000000,
  "ruleId":     "secure-coding/no-hardcoded-credentials",
  "severity":   "error",
  "pluginVersion": "3.1.3",
  "toolchain": {
    "node": "24.12.0", "eslint": "9.39.2", "typescript": "5.9.3",
    "tsCompiler": "tsc-classic", "platform": "darwin-arm64"
  }
}
```

Append-only. No mutation, no compaction in v0.1. (Add `logrotate` or restart with a new `STORAGE_PATH` periodically.)

## Rollup

`npx interlace-collector-rollup` produces `rollup.json` + `rollup.md`. The Markdown is the human-friendly view; the JSON is for downstream integration.

Privacy-preserving by design:

- `sessionId`s are bucketed by H/M/L cardinality only — never emitted in the rollup
- Rules with < 5 unique sessions are flagged ⚠ and not safe for public re-publication
- No PII is collected at the wire layer; the rollup adds none

## Deployment recipes

### Fly.io

```toml
# fly.toml
app = "interlace-collector"
[env]
  PORT = "8080"
  STORAGE_PATH = "/data/telemetry-events.ndjson"
  POLICY_PATH = "/data/POLICY.md"
[mounts]
  source = "telemetry_data"
  destination = "/data"
[[services]]
  internal_port = 8080
  protocol = "tcp"
[[services.ports]]
  handlers = ["http"]
  port = 80
[[services.ports]]
  handlers = ["tls", "http"]
  port = 443
```

### Docker

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package.json src ./
EXPOSE 4317
CMD ["node", "src/server.mjs"]
```

### Kubernetes

`Deployment` + `Service` + `PersistentVolumeClaim` for `STORAGE_PATH`. Standard.

## Why this exists

The [`@interlace/telemetry`](../interlace-telemetry/) client is opt-in (off by default). For the opt-in to mean anything, an operator needs a place to send the data. This is that place — minimal, dependency-free, single-file, MIT-licensed. Run your own.

## Versioning

v0.1.x is reference-implementation quality. Production deployments should expect changes; pin a version.
