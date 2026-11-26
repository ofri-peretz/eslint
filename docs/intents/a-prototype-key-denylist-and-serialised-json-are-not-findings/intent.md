---
slug: a-prototype-key-denylist-and-serialised-json-are-not-findings
opened: 2026-11-26
packages:
  - eslint-plugin-secure-coding
cases:
  - ILB-0203
  - ILB-0204
---

# Intent — a prototype-key denylist and serialised JSON are not findings

**Status:** shipped · **Opened:** 2026-11-26 · **Owner:** @ofri-peretz

## What is wanted

Two false positives found dogfooding the strict configs against the protocol-ctf
labs in `ofri-peretz/security-research` (`protocol-ctf/docs/SCANNER-RESULTS.md`,
run 2) stop reporting, with recall on every existing case unchanged:

1. `detect-object-injection` reported `massAssignment` on a recursive merge
   guarded by `if (FORBIDDEN.has(key)) continue;`, where `FORBIDDEN` is a
   module `const` Set of `__proto__`, `constructor` and `prototype` (ws-3
   fixed server). The `key === '__proto__' || …` spelling of the same guard was
   already credited.
2. `no-improper-sanitization` reported the `'<redacted>'` literal in
   `ws.send(JSON.stringify({ … ? '<redacted>' : CONFIG[m.key] }))` (ws-2).

## Why now

The protocol-ctf labs are the first real code the strict configs were run
against, and these two reports sat on the FIXED servers: a scanner that flags
the remediation teaches its users to turn the rule off.

## Constraints

- Decided from structure, never from names: the denylist is read from what the
  binding holds (a single `const` array literal, frozen array, or `new Set` of
  one), and only when the membership test is a bare `if` test whose branch
  exits. A denylist missing a prototype key, a test that falls through, a
  caller-supplied set and a reassignable binding all still report.
- A serialised literal carrying executable markup (`<script>`, an inline
  handler, `javascript:`) still reports, as the innerHTML literal path does;
  the same literal reaching a sink without `JSON.stringify` still reports.

## Done when

- `denylist-guard.test.ts` and `json-serialised-literal.test.ts` pass, and
  their valid cases fail on the unfixed rules.
- ILB-0203 and ILB-0204 are `silent` in `npm run case-registry`.
- Every existing test of both rules passes unchanged.
