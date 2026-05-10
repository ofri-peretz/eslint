# @interlace/telemetry

> Opt-in, anonymized usage telemetry for Interlace ESLint plugins. **Off by default.** Powers fleet-wide rule-firing stats that feed the principle-#10 severity promotion gate.

## Install

```bash
npm install @interlace/telemetry
```

## How to opt in

Set both env vars together:

```bash
export INTERLACE_TELEMETRY=1
export INTERLACE_TELEMETRY_ENDPOINT=https://your-collector.example.com/ingest
```

Without both set, the package is a no-op. Zero data leaves your machine.

## What we collect (opted in)

Per rule firing:
- `ruleId` (e.g., `secure-coding/no-hardcoded-credentials`)
- `severity` (`warn` / `error`)
- `pluginVersion`
- `sessionId` (random UUID per process — not persistent, can't tie to a user)
- `toolchain` (node / eslint / typescript / tsCompiler / platform)

## What we DO NOT collect

Source code, file paths, line numbers, AST snippets, hostnames, usernames, IPs.

Full policy in [TELEMETRY.md](./TELEMETRY.md).

## Inspect what's enabled

```bash
node -e "import('@interlace/telemetry').then(m => console.log(m.describeTelemetry()))"
```

## Why we'd ask you to opt in

The severity promotion gate (rules require precision ≥ 95% before promotion to `error`) currently relies on a 22-OSS-repo Wild bench corpus. Fleet telemetry would replace that with real production data — tightening confidence intervals dramatically.

We will *never* require it.

## 📦 Compatibility

| Package | Version |
| :--- | :--- |
| ESLint | `^8.0.0 \|\| ^9.0.0 \|\| ^10.0.0` |
| Node.js | `>=18.0.0` |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) — current ecosystem share data, the 20% gate, and the forward-looking exception that covers v10.

