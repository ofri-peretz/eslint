---
slug: grpc-identity-is-not-read-from-metadata
opened: 2026-11-26
packages:
  - eslint-plugin-grpc-security
  - oxlint-plugin-grpc-security
cases:
  - ILB-0197
  - ILB-0198
---

# Intent — a gRPC caller identity read from metadata is reported

> Stage 1 artifact. Opened from dogfooding the plugins on the
> `ofri-peretz/security-research` protocol-ctf labs. grpc-1 ("Trust the Gateway")
> is one of the misses listed in that repo's `docs/plugin-backlog.md`; grpc-2
> shipped as `no-unguarded-reflection` in eslint#1826.

**Status:** review · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

`eslint-plugin-grpc-security` gains `no-identity-from-metadata`. The rule reports a
`.get(…)` read of a gRPC handler's call metadata whose value reaches an equality
check against a per-request record field (`acc.owner !== user`) inside an `if` or
ternary test, followed through consts, string wrappers and same-file helpers. It
stays silent when the value is resolved first, by a lookup keyed by it or a call
that takes it. The grpc-1 lab server reports at its `callerOf` read. The reference
fix, which resolves the caller from a server-side token table, does not.

## Why now

The grpc-1 lab exploit sends `x-authenticated-user: treasury` straight to the
backend port and reads another user's account. No published Interlace rule
reported `protocol-ctf/challenges/grpc/grpc-1/server.mjs:20`.

## Affected users and systems

`eslint-plugin-grpc-security` and its oxlint alias (still unreleased, so 0.1.0
ships with both rules). The rule joins `recommended`. No other plugin changes.

## Constraints

- Decide from flow, never from a header's name. The litmus: rename every header
  and identifier, and the verdict does not change.
- A comparison with `process.env` or a module-level constant is a credential
  check, not an identity, and must stay silent.
- Type-unaware, runs on oxlint, intra-file only.

## Success criteria

- `npx vitest run` in `packages/eslint-plugin-grpc-security`: both grpc-1 lab files
  (`benchmarks/corpus/CWE-290/`) give the expected verdict, at 100% coverage.
- The invalid cases fail against a no-op rule (recorded in the PR).
- `npm run fidelity -- grpc-security/no_identity_from_metadata`: 0 FP, 0 FN.
- `npx tsx scripts/case-registry.mts --check` verifies ILB-0197 and ILB-0198.

## Open questions

An identity used as a lookup key (`DATA_BY_USER[user]`) or compared with a string
literal (`user === 'admin'`) is not reported. Whether either can be told apart from
a legitimate credential check by structure alone is not settled.
