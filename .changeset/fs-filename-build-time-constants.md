---
'eslint-plugin-node-security': patch
---

`detect-non-literal-fs-filename` no longer reports paths that are fixed at
build time.

```js
const BUILD_DIR = path.resolve(__dirname, 'build');
fs.readFileSync(`${BUILD_DIR}/package.json`);   // was reported
```

The safe-construction check already understood `path.join(__dirname, 'x')` —
but only when it was the *direct* argument. One hop through a `const` lost the
verdict, which is why every rollup config, gulpfile and build script in the
corpus reported.

The check now resolves through `const` bindings, template literals, string
concatenation, `__dirname`/`__filename` and `process.cwd()`, to a depth of 4
so mutually-referential bindings terminate. `let` is deliberately excluded: it
can be reassigned between the binding and the call, so proving its initializer
constant proves nothing about the value actually read.

Constant does **not** mean harmless — `path.join(__dirname, '../etc/passwd')`
is fixed at build time and still traversal, and still reports.

Measured on the 8-repo corpus: **122 findings → 113**. The remainder are paths
genuinely assembled at runtime (`path.dirname(x)` over a config array, opaque
helper calls), which this rule cannot clear without real taint analysis.

The old `isSafePathConstruction` is deleted rather than left alongside: the new
check subsumes it exactly, and two duplicate implementations of "is this path
safe" would drift.
