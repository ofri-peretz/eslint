---
'eslint-plugin-node-security': minor
'eslint-plugin-secure-coding': minor
'eslint-plugin-browser-security': patch
'@interlace/eslint-devkit': minor
---

Fix a command-injection false negative, repair every rule's documentation link, and close the
detection gaps measured against eslint-plugin-security's own test suite.

**Security fix (`node-security/detect-child-process`).** `containsDynamicStrings` matched on
node types and let `MemberExpression`/`CallExpression` fall through to "not dynamic", so
`exec(req.query.cmd)` was silently skipped whenever `allowLiteralStrings: true` was set — a
false negative on the exact input shape the rule exists to catch. It now asks whether the
argument is provably constant instead, which also stops `const CMD = 'ls'; exec(CMD)` from
reporting.

**Every rule documentation link returned 404.** Rules inherited a placeholder URL pointing at
`packages/eslint-plugin/docs/rules/<name>.md`, a path that has never existed, so every "see
docs" link in every IDE, CI annotation and SARIF file was broken. `withCanonicalDocsUrls()`
now stamps the canonical `eslint.interlace.tools` URL at plugin-export time, locked per package.

**New devkit primitives.** `isStaticExpression()` (scope-aware constant folding, with a
`treatConstAsStatic: false` escape hatch) and `resolveModuleBinding()` (resolves a value back
to its source module through `node:` prefixes, chained requires, renamed destructuring,
sub-namespaces and configurable drop-ins like `fs-extra`).

**New rules and coverage.**
- `secure-coding/no-bidi-characters` — Trojan Source / CWE-1007, with a removal suggestion.
- `secure-coding/detect-object-injection` now catches the prototype-polluting copy loop
  (`for (const k in source) target[k] = source[k]`) when the source is a function parameter,
  suppressing the generic report so it adds no duplicate findings.
- `node-security/detect-non-literal-fs-filename` covers the ~19 path-taking `fs` methods the
  list omitted (`open`, `rename`, `copyFile`, `symlink`, …) and resolves bindings the
  namespace tracker missed. `realpath` and `exists`/`watch` are deliberately excluded —
  canonicalisation is the documented mitigation, not a sink.
- `node-security/detect-child-process` handles `node:child_process`, chained
  `require('child_process').exec()`, and a bare `require('child_process')`.
- `browser-security/no-innerhtml` adds the `srcdoc` sink.

**Packaging.** All three plugins now export `./package.json`, which tooling needs for version
detection.

**Two verdicts that were sharing one branch.** `detect-non-literal-fs-filename` and
`detect-child-process` treated "declared nowhere" and "resolved, but not provably constant"
as the same unresolved answer. They are not the same:

```js
fs.readFile(filename);   // `filename` bound nowhere — now reports
function read(p) { return fs.readFile(p); }   // a parameter — stays quiet
```

A free variable (`ref.resolved === null`, the scope analyser's own verdict) admits no local
reasoning at all, so it reports. Anything that resolves keeps the behaviour introduced when
these rules were inverted to report reachable taint — the rollup configs, glob enumerations
and thin fs facades that made up 105 of 113 adjudicated findings stay silent.

**A false negative in taint provenance.** `let c = 'ls'; c = req.query.c; exec(c)` answered
`'ls'`, because only the declarator's initialiser was read. Provenance is now the last write
before the use — not *any* write, which inverts the error: `var mod = req.body.a; var mod =
"fs"; require(mod)` loads `fs`, and reporting that is a false positive whose fix is already
applied.

**`process` is the operator, not a remote attacker.** `spawn(process.execPath, argv)` and
`execFileSync(binTarget, ['--version'])` were reported as command injection while being the
documented remediation for it. `process.argv`/`process.env` come from whoever launched the
program, from a shell they already control — no lever for the two questions the no-shell path
asks, both about reaching a binary you otherwise could not. `process` therefore no longer
steers the no-shell path, and **still does steer the shell path**, where
`execSync('rm -rf ' + process.argv[2])` splices a value into code. Both cases are pinned.

Measured across 8 real repositories: 31 findings, unchanged from before these detection
additions, with no rule over its budget.
