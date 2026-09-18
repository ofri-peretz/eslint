---
'eslint-plugin-reliability': patch
'eslint-plugin-maintainability': patch
---

fix: `no-unhandled-promise` dropped `ignoreInTests` on `.mts` / `.cts` / `.mjs` / `.cjs`

The predicate was `/\.(test|spec)\.(ts|tsx|js|jsx)$/` — an alternation that never learned about the ESM and CommonJS module extensions. The same source body, with only the filename varied at default options:

```text
c.test.ts  -> 0 reports      c.test.mts -> 1 report
c.test.tsx -> 0 reports      c.test.cts -> 1 report
c.test.js  -> 0 reports      c.test.mjs -> 1 report
c.test.jsx -> 0 reports      c.test.cjs -> 1 report
```

A default-on option silently stopped applying, with no signal to the user, on a HIGH-severity CWE-tagged rule. `.test.mjs` and `.test.mts` are ordinary in `"type": "module"` packages and under Node's native test runner; this repo ships one itself in `eslint-formatter-sarif`.

The documented contract is ecosystem-wide and extension-agnostic: `scripts/document-rule-options.ts` defines `ignoreInTests` once, for every plugin, as "Skip this rule in `*.test.*` / `*.spec.*` files", and the devkit implements that as `[cm]?[jt]sx?`.

Both copies now read `/\.(test|spec)\.[cm]?[jt]sx?$/` — byte-for-byte the extension tail of the devkit's own `TEST_BASENAME`. The two rules are separate drifted files rather than a shared module, so each was fixed.

Deliberately **not** switched to the devkit's `isTestFilePath` helper: that also exempts `fixture|mock|e2e-spec|stories|story` basenames and whole test _directories_, which would silence the rule on `.stories.ts` and on everything under `__tests__/`. That is a much larger behavior change than the extension defect being fixed here, and it is unmeasured. A comment at both sites records the reasoning so the next reader does not helpfully swap the helper in.

Roughly a dozen other rules across the repo still hand-roll the same stale alternation; they are out of scope here and noted for a separate pass.
