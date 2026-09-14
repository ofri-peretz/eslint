---
'@interlace/eslint-devkit': patch
---

security(eslint-devkit): `identifierWords` no longer backtracks quadratically (CWE-1333)

CodeQL alert #1331 (`js/polynomial-redos`, High). The `.replace()` chain behind
`identifierWords` — used by `nameHasWord`/`nameHasAnyWord`/`matchedWords`, the
whole-word identifier matching shared across several plugins — backtracked
quadratically on an identifier with a long run of uppercase letters and no
trailing lowercase (`/([A-Z]+)([A-Z][a-z])/g` re-walking the run from every
start position). Measured: a 50,000-character identifier cost roughly 1.5
seconds. `identifierWords` runs on whatever identifiers a rule lints, so an
adversarial or generated/minified identifier was not a hypothetical input.

Replaced with a single left-to-right scan that inspects each character once.
Word-splitting behavior (camelCase/PascalCase/snake_case/kebab-case/
SCREAMING_SNAKE, the acronym boundary, letter/digit runs) is unchanged — this
is a performance and availability fix, not a behavior change.
