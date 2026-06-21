---
'eslint-plugin-browser-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-jwt': patch
'eslint-plugin-lambda-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-pg': patch
'eslint-plugin-secure-coding': patch
---

Align every security rule's `meta.docs.cvss` to the CVSS its finding actually
emits. The emitted machine-readable message sources its `CVSS:x` from
`CWE_MAPPING` via `formatLLMMessage` → `enrichFromCWE`, but the static
`meta.docs.cvss` documentation field had drifted on 45 rules across these 7
plugins — e.g. `no-hardcoded-credentials` documented `9.5` while emitting
`CVSS:9.8` (the value the published article and SARIF/LLM consumers already
read).

This corrects the **documentation metadata only** — no emitted finding changes.
Locked by `security-cvss-docs-consistency.lock.test.ts` (cross-plugin: every
security rule's `meta.docs.cvss` must equal the CVSS it emits), the
`no-hardcoded-credentials` rule lock (real ESLint `Linter` emission), and a
devkit `enrichFromCWE` contract test pinning `CWE-798 → 9.8`.

Follow-up (not in scope): 50 security rules document a CVSS that never appears
in any emitted message (their messages carry no CWE), and several rules emit the
generic CWE score where a rule-specific score may be warranted — both change
emitted output and are separate decisions.
