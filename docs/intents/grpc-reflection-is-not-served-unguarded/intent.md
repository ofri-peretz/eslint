---
slug: grpc-reflection-is-not-served-unguarded
opened: 2026-11-26
packages:
  - eslint-devkit
  - eslint-plugin-grpc-security
  - oxlint-plugin-grpc-security
cases:
  - ILB-0195
  - ILB-0196
---

# Intent — gRPC server reflection registered with no guard is reported

> Stage 1 artifact. Opened from dogfooding the published plugins on the
> `ofri-peretz/security-research` protocol-ctf labs: 9 vulnerable servers, and the
> plugins caught 3 of 7 applicable root causes. grpc-2 ("Hidden Methods") is one
> of the 4 misses, listed in that repo's `docs/plugin-backlog.md`.

**Status:** review · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

`eslint-plugin-grpc-security` exists, with `no-unguarded-reflection`. It reports
`new ReflectionService(def).addToServer(server)` (`@grpc/reflection`) and
`addReflection(server, …)` (`grpc-server-reflection`) when no branch in the file
stands between the registration and the program running, and is silent once one
does. The grpc-2 lab server reports; its reference fix does not.

## Why now

The grpc-2 lab exploit is `grpcurl list` against a public listener that serves
reflection, which names an internal `ops.Maintenance` service and its
`ExportTable` method. No published Interlace rule reported
`protocol-ctf/challenges/grpc/grpc-2/server.mjs:56`. The rule cannot live in
`node-security`: it fires only when a gRPC reflection package is loaded, and
RULE_AUTHORING's scope test puts SDK-gated rules in the SDK's own plugin. No gRPC
plugin existed.

## Affected users and systems

New packages `eslint-plugin-grpc-security` and `oxlint-plugin-grpc-security`
(0.1.0). `eslint-devkit` gains the `plugin-grpc-security` docs category entry.
The docs site gains the plugin's pages. No existing rule changes.

## Constraints

- Decide from structure: module bindings and branches, never identifier names or
  string values. A branch on a config flag is as much a guard as one on
  `NODE_ENV`.
- Type-unaware, and runs on oxlint.
- grpc-1 (identity read from client-settable metadata) is out of scope: deciding
  that a returned header value is "the caller's identity" needs a data-flow
  model this PR does not build.

## Success criteria

- `npx vitest run` in `packages/eslint-plugin-grpc-security`: both lab files
  (`benchmarks/corpus/CWE-306/`) give the expected verdict, with 100% coverage.
- The invalid cases fail against a no-op rule (recorded in the PR).
- `npx tsx scripts/case-registry.mts --check` verifies ILB-0195 and ILB-0196.

## Open questions

Whether reflection reaching a listener that also serves public services is worth
a stricter variant (report even when guarded, if internal services share the
server). Not knowable from one file today.
