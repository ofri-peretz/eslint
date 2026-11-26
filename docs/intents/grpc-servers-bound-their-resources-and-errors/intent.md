---
slug: grpc-servers-bound-their-resources-and-errors
opened: 2026-11-26
packages:
  - eslint-plugin-grpc-security
  - oxlint-plugin-grpc-security
cases:
  - ILB-0199
  - ILB-0200
  - ILB-0201
  - ILB-0202
---

# Intent — gRPC servers keep message sizes bounded and errors to themselves

> Stage 1 artifact. Third step of building `eslint-plugin-grpc-security` out to a
> complete 0.1.0, after reflection (eslint#1826) and metadata identity (eslint#1827).

**Status:** review · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

---

## What is wanted

Two rules join `eslint-plugin-grpc-security`, both in `recommended`:

- `no-unbounded-message-size` reports `grpc.max_receive_message_length` /
  `grpc.max_send_message_length` set to a value that evaluates to a negative
  number or above 100 MiB.
- `no-error-detail-leak` reports a status sent through a gRPC handler's callback,
  `call.emit('error')` or `call.destroy()`, when its `details` are built from a
  caught error's stack or message.

The rule helpers that recognise a handler move to `src/utils/grpc-flow.ts`, shared
with `no-identity-from-metadata`, which is otherwise unchanged.

## Why now

Neither shape is reported by any Interlace plugin today. A message cap of -1 lets one
request exhaust a server's memory (CWE-770). Status details built from a caught error
hand the client a stack trace, a query or an internal URL (CWE-209). The
`credentials.createSsl(…, { checkServerIdentity })` rule was also proposed and left
out: `browser-security/no-disabled-certificate-validation` already reports that line,
and a second plugin reporting the same line is a placement defect.

## Affected users and systems

`eslint-plugin-grpc-security` and its oxlint alias, still unreleased. The CWE-209 and
CWE-770 corpora gain gRPC fixtures, including the security-research grpc-3 lab server
verbatim.

## Constraints

- Decide from structure: gRPC's own channel-argument keys, a handler's parameters, a
  caught error's binding. Never from a variable or header name.
- A size the source cannot evaluate (configuration) and a caught error passed as is
  (`cb(e)`) stay silent.
- Type-unaware, runs on oxlint.

## Success criteria

- `npx vitest run` in `packages/eslint-plugin-grpc-security` passes at 100% coverage,
  and both rules' invalid cases fail against a no-op rule.
- `npm run fidelity -- grpc-security` reports 0 FP and 0 FN for both new models.
- `npx tsx scripts/case-registry.mts --check` verifies ILB-0199 to ILB-0202.

## Open questions

Whether 100 MiB is the right line for "unbounded". It is the threshold the request
named. A per-project option can come once someone has a real need for a larger cap.
