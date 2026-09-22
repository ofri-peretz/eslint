---
'eslint-plugin-reliability': patch
---

fix: four more rules dropped `ignoreInTests` on `.mts` / `.cts` / `.mjs` / `.cjs`

`no-silent-errors`, `no-missing-error-context`, `no-missing-null-checks` and `no-unsafe-type-narrowing` each hand-rolled `/\.(test|spec)\.(ts|tsx|js|jsx)$/` — an alternation that never learned about the ESM and CommonJS module extensions. The same source body, with only the filename varied at default options:

```text
c.test.ts  -> 0 reports      c.test.mts  -> 1 report
                             c.spec.cjs  -> 1 report
```

A default-on option silently stopped applying, with no signal to the user. `.test.mts` and `.test.mjs` are ordinary in `"type": "module"` packages and under Node's native test runner, which is exactly where the burgee corpus sweep that surfaced this lints.

The documented contract is ecosystem-wide and extension-agnostic. `BENCHMARK-CRITERIA.md` requires every rule to self-skip test files "by path and by filename (`*.spec.*`, `*.test.*`)", and the devkit's own `TEST_BASENAME` implements that tail as `[cm]?[jt]sx?` — pinned by `skip-test-files.test.ts`, which asserts that `src/handler.spec.mts` **is** a test file.

All four now read `/\.(test|spec)\.[cm]?[jt]sx?$/` — byte-for-byte the extension tail of `TEST_BASENAME`. They are separate drifted files rather than a shared module, so each was fixed.

Deliberately **not** switched to the devkit's `isTestFilePath` helper: that also exempts `fixture|mock|e2e-spec|stories|story` basenames and whole test _directories_, which would silence these rules on `.stories.ts` and on everything under `__tests__/`. That is a much larger, unmeasured behavior change than the extension defect being fixed here. A comment at each site records the reasoning.

This is the follow-up the sibling fix for `no-unhandled-promise` explicitly deferred ("roughly a dozen other rules share the stale alternation; out of scope here"). `no-unhandled-promise` itself is untouched — its fix is already in flight on another branch.

Six fixtures per rule failed before the fix and pass after; two further fences per rule (option off, and a production `.mts`) passed before as well, by construction — they guard against over-widening rather than witness the defect. No pre-existing test changed.
