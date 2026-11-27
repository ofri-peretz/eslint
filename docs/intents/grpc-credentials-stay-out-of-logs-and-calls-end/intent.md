---
slug: grpc-credentials-stay-out-of-logs-and-calls-end
opened: 2026-11-26
packages:
  - eslint-plugin-grpc-security
  - oxlint-plugin-grpc-security
cases:
  - ILB-0207
  - ILB-0208
  - ILB-0209
  - ILB-0210
---

# Intent — gRPC credentials stay out of logs, and client calls end

> Stage 1 artifact. Last step of building `eslint-plugin-grpc-security` out to a
> complete 0.1.0 (eslint#1826, #1827, #1830, #1831).

**Status:** review · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

Two rules join `eslint-plugin-grpc-security`:

- `no-credential-metadata-logging` (`recommended`) reports a log call that receives
  gRPC metadata, a dump of it (`getMap()`, `toJSON()`), or a credential header's
  value.
- `require-call-deadline` (`strict` only) reports a client call whose options carry
  no `deadline`. It stays silent wherever an argument the file cannot read could be
  the options.

With them the plugin ships eight rules: seven in `recommended`, all eight in
`strict`.

## Why now

These complete the planned 0.1.0. A token in a log store outlives the request by
months (CWE-532). A call with no deadline against a stalled server never ends
(CWE-400).

## Affected users and systems

`eslint-plugin-grpc-security` and its oxlint alias, still unreleased. A new
`benchmarks/corpus/CWE-532` holds a vulnerable and a safe gRPC fixture.

## Constraints

- The Metadata API is the anchor for logging. The header set is the HTTP definition
  of a credential header, not a guess at a variable's name. A logger is `console` or
  a receiver bound to a logging library's export.
- `require-call-deadline` stays out of `recommended`. Interceptors and wrappers set
  deadlines the file cannot see, so a missing deadline is a practice, not a proven
  defect.
- Type-unaware, runs on oxlint.

## Success criteria

- `npx vitest run` in `packages/eslint-plugin-grpc-security` passes at 100% coverage,
  and both rules' invalid cases fail against a no-op rule.
- `npm run fidelity -- grpc-security` reports 0 FP and 0 FN for all eight models.
- `npx tsx scripts/case-registry.mts --check` verifies ILB-0207 to ILB-0210.
- The seven protocol-ctf gRPC lab files lint with exactly two findings under
  `recommended`.

## Open questions

Loggers created by an application's own wrapper module (`import log from './log'`)
are not followed. Whether a one-hop follow into a same-repo logger module is worth
the cost is open.
