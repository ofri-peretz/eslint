---
slug: grpc-plaintext-transport-is-reported-only-when-proven
opened: 2026-11-26
packages:
  - eslint-plugin-grpc-security
  - oxlint-plugin-grpc-security
cases:
  - ILB-0203
  - ILB-0204
  - ILB-0205
  - ILB-0206
---

# Intent — plaintext gRPC is reported where the file proves the risk

> Stage 1 artifact. Fourth step of building `eslint-plugin-grpc-security` out to a
> complete 0.1.0 (eslint#1826, #1827, #1830).

**Status:** review · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

Two rules join `eslint-plugin-grpc-security`, both in `recommended`:

- `no-insecure-server-credentials` reports `ServerCredentials.createInsecure()` bound
  to a wildcard address (`0.0.0.0`, `[::]`, `::`) or a bare port.
- `no-insecure-channel-credentials` reports `credentials.createInsecure()` when a call
  on the client built from it passes `Metadata` the file fills with a credential
  header or a `Bearer` value.

Every security-research protocol-ctf gRPC lab still lints clean under them. They bind
through `lib/grpc.mjs` with a `127.0.0.1` default.

## Why now

Plaintext transport is the most common gRPC misconfiguration, and no Interlace rule
reports it. The first proposal decided exposure from the host name, exempting
`localhost` and reporting configured hosts. RULE_AUTHORING rules that out ("never
decide by matching specific string values … hostname lists"). This version reports
only what the code proves: a wildcard bind, or a secret on the wire.

## Affected users and systems

`eslint-plugin-grpc-security` and its oxlint alias, still unreleased. A new
`benchmarks/corpus/CWE-319` holds `lib/grpc.mjs` verbatim as a safe fixture.

## Constraints

- No host-name decisions: a named or configured host stays silent, and so does an
  insecure channel that carries no credential.
- The credential header set is the HTTP definition (RFC 9110, RFC 6265, plus
  `x-api-key`), anchored on the `Metadata` API, never on a local variable's name.
- Type-unaware, runs on oxlint.

## Success criteria

- `npx vitest run` in `packages/eslint-plugin-grpc-security` passes at 100% coverage,
  and both rules' invalid cases fail against a no-op rule.
- `npm run fidelity -- grpc-security` reports 0 FP and 0 FN for both new models.
- `npx tsx scripts/case-registry.mts --check` verifies ILB-0203 to ILB-0206.
- All seven protocol-ctf gRPC lab files lint with exactly two findings (grpc-1
  identity, grpc-2 reflection).

## Open questions

Call credentials composed onto a TLS channel are not followed, since there is nothing
to report there. Whether a client that sends credentials through an interceptor
should count is open.
