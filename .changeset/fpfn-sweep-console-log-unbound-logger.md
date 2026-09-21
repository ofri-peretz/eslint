---
'eslint-plugin-operability': patch
---

fix: `no-console-log`'s `convert` fixer emitted a reference to a logger that was never imported

The `convert` strategy rewrote the callee to `<effectiveLogger>.<method>`, where `effectiveLogger` is `loggerName || detectedLogger || 'logger'`. That last fallback is a bare string, so on a file importing no logger the fix invented a binding: working code became a `ReferenceError` (TS2304 under TypeScript), and `no-undef` reports on the output where it reported nothing on the input. `fixable: 'code'` means safe to apply unattended, and this rule's own docs prescribe `--fix` in CI.

The `remove`/`comment` arm of the same `fix()` already refuses to emit an unsafe rewrite, and its comment cites the very line this was found on — burgee `packages/burgee/src/yargs/factory.ts:1034`, the CLI's stdout fallback, whose only logger is the private field `#logger` that an import scanner cannot see. `convert` was never brought under that guard.

The logger name is now resolved against the scope chain and the fix declines when it has no binding. The report is unaffected; only the automatic rewrite is withheld. Eight pre-existing fixtures pinned the defect as expected `output:` — four whose stated purpose is the detection false-paths (they keep their branches and now assert no fix), and four asserting "the configured name is used", which now carry the import they always implied. Every fixture that already imported its logger passes unchanged.
