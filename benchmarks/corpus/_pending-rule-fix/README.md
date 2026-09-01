# Fixtures waiting on a rule fix

A false positive verified in the wild, written up as a fixture, but **not yet
scored** — because the rule that produces it has not been fixed.

They are parked here rather than in `CWE-NNN/safe/` for one reason: the
per-CWE false-positive budget in `scripts/recall-gate.ts` is **0**, and it is
right to be. Dropping a known-failing fixture into the scored corpus leaves two
bad options — a red `main`, or a budget raised to accept the bug. Raising the
budget is how a false positive becomes permanent.

So the contract is:

1. A verified FP lands here immediately, with `@source` and `@sealed`, so the
   reproduction is never lost.
2. When the rule is fixed, the fixture moves into `CWE-NNN/safe/` **in the same
   PR**. It fails before the fix and passes after — the standard this repo
   already applies to bugs.
3. This directory is not scored. A fixture that lingers here is a precision bug
   nobody has closed.

| fixture | rule it seals | found in |
| :--- | :--- | :--- |
| `CWE-079.dompurify-optional-chaining.js` | `browser-security/no-innerhtml` — blind to `DOMPurify?.sanitize()` | 7 Adobe repos (`aemdemos/*`, `aemsites/idfc`) |
| `CWE-798.typeorm-migration-name.js` | `secure-coding/no-hardcoded-credentials` — TypeORM migration `name` field | humanprotocol/human-protocol, ~20 occurrences |
