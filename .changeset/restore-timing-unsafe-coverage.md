---
'eslint-plugin-node-security': minor
---

Add `no-timing-unsafe-compare` to the `recommended` preset, restoring CWE-697
coverage.

`secure-coding/no-insecure-comparison` was removed from every `secure-coding`
preset, with `node-security/no-timing-unsafe-compare` named as the replacement.
But that rule was not in any `recommended` preset, so the practical result was
that **no `recommended` preset anywhere covered CWE-697 timing-unsafe
comparison**, and the migration note pointed users at a rule they would have had
to enable by hand — which the note did not say.

It enters at `'warn'` rather than `'error'`, matching the precedent already set
by `no-deprecated-buffer` in this preset: adopters shouldn't have CI turn red on
a version bump. Promote to `'error'` on the next major.

Note the coverage now lives in a different package than before. A project that
installs only `eslint-plugin-secure-coding` and relied on its presets for this
check needs `eslint-plugin-node-security` as well.

A lock test in `src/index.test.ts` fails if the rule leaves `recommended` again,
since that would silently make the migration note false.
