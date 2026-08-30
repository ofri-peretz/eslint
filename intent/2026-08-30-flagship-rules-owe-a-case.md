---
slug: flagship-rules-owe-a-case
opened: 2026-08-30
packages:
  - eslint-plugin-browser-security
  - eslint-plugin-import-next
  - eslint-plugin-mongodb-security
  - eslint-plugin-react-features
  - eslint-plugin-secure-coding
  - eslint-plugin-vercel-ai-security
cases:
  - ILB-0001
---

## What

Give each of the nine flagship rules a registry case: an `ILB-nnnn` entry with
a CWE, a severity carrying its source, at least one verifiable reference, and a
`defect` / `decoy` / `remedy` triple.

Seven of the nine have none today:

| Rule                                              | Case |
| ------------------------------------------------- | ---- |
| `browser-security/no-innerhtml`                   | ✅   |
| `secure-coding/detect-object-injection`           | ✅   |
| `browser-security/no-postmessage-wildcard-origin` | —    |
| `import-next/no-cycle`                            | —    |
| `mongodb-security/no-unsafe-query`                | —    |
| `react-features/hooks-exhaustive-deps`            | —    |
| `secure-coding/no-hardcoded-credentials`          | —    |
| `secure-coding/no-redos-vulnerable-regex`         | —    |
| `vercel-ai-security/no-unsafe-output-handling`    | —    |

## Why

Stage 2 of the SDLC says the design artifact for a rule is an executable claim,
and `check:new-rule-cases` now enforces that for rule 471 onward. It says
nothing about the 443 that predate it — correctly, because retrofitting all of
them is not work anybody finishes.

But **27 of 470 rules have a case (6%)**, and the seven above are not arbitrary
members of the 443. They are the rules named in `.agent/flagship-rules.md` —
the ones the benchmarks lead with, the articles cite, and a stranger evaluating
us reads first. A flagship rule with no stated defect is the weakest possible
position for the claim we make loudest.

`detect-object-injection` already shows what the case buys: the head-to-head
against `eslint-plugin-security` is defensible line by line precisely because
every claim in it is an executed case rather than an assertion.

## Constraints

- **A case that cannot fail is not a case.** Each entry is verified failing
  against a sabotaged rule before it counts. ILB-0004 had to be rewritten after
  passing against a deliberately broken fix.
- Every `reference` is fetched and marked `verified` or left `false`. A CVE
  number nobody opened is decoration.
- Severity carries its `source`. An unsourced CVSS is our opinion wearing a
  number's clothes.
- No rule behaviour changes here. If writing a case surfaces a defect, that is
  a separate branch with its own intent — a case-writing change that also fixes
  rules cannot be reviewed as either.
- `check:case-registry` must stay green: the verified SET is ratcheted by id,
  so nothing may be swapped for an easier case.

## Done when

- Rules with a registry case: **27 → 34**.
- All nine flagship rules appear in some case's `coverage[]`.
- `npm run check:case-registry` passes, and the verified count rises by the
  number of new cases rather than staying flat.
- Each new case's `defect` fires and its `decoy` and `remedy` stay quiet, shown
  by the registry runner rather than asserted here.
