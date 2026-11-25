---
'eslint-plugin-express-security': minor
---

`require-express-body-parser-limits` now treats any explicit `limit` as a deliberate choice and reports only a body parser (`json`, `urlencoded`, `raw`, `text`) that sets **no** `limit`. This is a policy change, not a fix: before, the rule did the opposite. An explicit limit above `maxLimit` (5 MB by default) reported, and a parser with no limit did not.

- The message id changes from `excessiveLimit` to `missingLimit`, and the rule is scored 5.3 (MEDIUM), matching its label.
- `maxLimit` and `excessiveLimits` are still accepted so existing configs keep loading, and are ignored.
- Options the rule cannot read (`express.json(opts)`, a spread, a computed key) abstain.
- The fidelity model for this rule is updated to the new spec in the same change.
