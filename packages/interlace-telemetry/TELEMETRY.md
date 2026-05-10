# Interlace Telemetry — Opt-In Policy

> **TL;DR.** Off by default. To opt in, set both `INTERLACE_TELEMETRY=1` AND `INTERLACE_TELEMETRY_ENDPOINT=https://...` in your environment. Without those two variables set together, the package is a no-op.

## What we collect (when opted in)

| Field | Example | Why |
| :--- | :--- | :--- |
| `ruleId` | `secure-coding/no-hardcoded-credentials` | To know which rules fire most |
| `severity` | `error` or `warn` | To calibrate the severity contract (principle #10) |
| `pluginVersion` | `3.1.3` | To track regressions across plugin releases |
| `sessionId` | random UUID, regenerated per process | To group events from the same lint run; cannot be tied to a user across runs |
| `toolchain.node` | `24.12.0` | Cross-cutting compatibility data |
| `toolchain.eslint` | `9.39.2` | Same |
| `toolchain.typescript` | `5.9.3` | Same |
| `toolchain.tsCompiler` | `tsc-classic` or `tsc-go` | Tracks the TS 5 → TS 6 migration |
| `toolchain.platform` | `darwin-arm64` | OS / arch only — *not* hostname |

## What we DO NOT collect

- **Source code** — not even snippets.
- **File paths** — not absolute, not relative, not stripped.
- **Repo names, project names, or directory names.**
- **Line numbers, column numbers, AST snippets.**
- **Anything that could re-identify you** — no hostname, no username, no IP address (the receiver may log connection IPs; that's a separate concern handled by the endpoint operator).

## How to opt in

```bash
# 1. Choose an endpoint you trust. Could be:
#    - your own org's collector
#    - the public Interlace endpoint (when it lands)
#    - a researcher's collector during a study
export INTERLACE_TELEMETRY=1
export INTERLACE_TELEMETRY_ENDPOINT=https://your-collector.example.com/ingest

# 2. Run lint as normal. Telemetry flushes in batches of 50 events
#    and again on process exit.
npm run lint

# 3. Verify what the package is sending:
node -e "import('@interlace/telemetry').then(m => console.log(m.describeTelemetry()))"
```

## How to opt out (the default)

Don't set `INTERLACE_TELEMETRY`. The package becomes a no-op. Existing code that calls `recordRuleFiring()` returns immediately without buffering, no network is touched.

To verify you're opted out, run the same `describeTelemetry()` check:

```bash
node -e "import('@interlace/telemetry').then(m => console.log(m.describeTelemetry()))"
# → enabled: false, endpointConfigured: false
```

## Why we'd ask you to opt in (eventually)

The severity contract (principle #10 — `error` requires precision ≥ 95% on Wild + Arena) currently relies on a **22-OSS-repo Wild corpus**. That's a useful signal but not representative of the long tail of production code. Fleet telemetry would change "this rule has 95% precision in our 22-repo sample" to "this rule has 95% precision across N production-firing samples," tightening the promotion-gate confidence intervals dramatically.

We will *never* require telemetry. The bench infrastructure works fully without it.

## Endpoint operator obligations (if you host one)

If you operate an endpoint that receives Interlace telemetry payloads, you agree to:

1. **Discard connection IPs** within 24 hours of receipt. The protocol doesn't include them, but your reverse proxy may log them.
2. **Aggregate before re-publishing**. Per-`sessionId` counts may not be re-published. Aggregate over ≥ 100 sessions before any public release.
3. **Honor deletion requests**. A user who runs with a `?revoke=<sessionId>` flag (TODO: client) may request deletion of any payload they previously sent.
4. **Publish your privacy policy**. Link it from a `GET /policy` endpoint at the same hostname.

## Future opt-in modes

We may add finer-grained controls (e.g., `INTERLACE_TELEMETRY_LEVEL=metadata-only` to drop even the `ruleId`) when there's user demand. Until then, the package is binary on/off.
