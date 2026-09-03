# Rule corpus — `node-security/no-data-in-temp-storage` (CWE-312 / CWE-377)

Written from CWE-312 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The rule carries two message ids and the corpus exercises both: data coming to
rest in a world-readable shared temp directory (CWE-312) and a *constant* name
inside it, which a local attacker can pre-create or symlink (CWE-377).

## vulnerable/

| Fixture | Shape |
|---|---|
| `01-express-session-dump.js` | `const fs = require('fs')` + literal `/tmp/...`, Express admin route |
| `02-cjs-destructured-write.js` | `const { writeFileSync } = require('node:fs')` — destructured CJS |
| `03-esm-fs-promises-write.js` | `import { writeFile } from 'node:fs/promises'`, template path under `/var/tmp` |
| `04-namespace-import-append.js` | `import * as fs from 'node:fs'` + `appendFileSync` |
| `05-fs-promises-member.js` | default import + `fs.promises.writeFile` |
| `06-tmpdir-template-path.js` | `` `${os.tmpdir()}/billing-report.csv` `` |
| `07-aliased-import-cast.ts` | `writeFileSync as write`, TypeScript, path via one `const`, payload `as string` |
| `08-create-write-stream-tmp.js` | `fs.createWriteStream('/tmp/...')` |
| `09-tmpdir-join-constant.js` | `path.join(os.tmpdir(), 'mycli-state.json')` written through |
| `10-intermediate-const-literal.js` | temp literal reaching the sink through one `const` |
| **adversarial wave** | |
| `11-computed-member-write.js` | `fs['writeFileSync'](...)` |
| `12-hoisted-sink-alias.js` | `const write = fs.writeFileSync; write('/tmp/...')` |
| `13-path-join-literal-tmp.js` | `path.join('/tmp', 'saml-assertion.xml')` |
| `14-tmpdir-concat.js` | `os.tmpdir() + '/agent-state.json'` |
| `15-fs-extra-outputfile.js` | `fs-extra`'s `outputFileSync` |

## safe/

| Fixture | Shape |
|---|---|
| `01-mkdtemp-then-write.js` | the remediation: `mkdtempSync(path.join(os.tmpdir(), 'export-'))`, then write inside |
| `02-random-segment.js` | `randomUUID()` segment — the path differs every run |
| `03-app-data-dir.js` | per-user application data directory, not shared temp |
| `04-templates-path.js` | `/templates` is not `/temp` (the Shopify/cli false positive) |
| `05-read-from-tmp.js` | a READ stores nothing |
| `06-tmp-only-in-message.js` | the vocabulary appears only in a log line and a docs URL |
| `07-mkdtemp-prefix-const.js` | the prefix hoisted to a `const`, then handed to `fsp.mkdtemp` |
| `08-tmpdir-join-logged-only.js` | a constant temp path that is only printed |
| `09-let-reassigned-to-project-path.js` | `let` whose last write before the sink is a project path |
| **adversarial wave** | |
| `10-temperature-path.js` | `temperature` starts with `temp` |
| `11-let-branch-literals.js` | a `let` whose every write is a non-temp literal |
| `12-mkdtemp-then-stream.js` | `createWriteStream` inside a mkdtemp directory |
| `13-project-temp-not-shared.js` | `templates`, `attempted`, `contemporary` in one file |

## What this corpus proved

Baseline on the first ten vulnerable / nine safe fixtures: **TP 3, FP 2, FN 7 —
P 0.60, R 0.30, F1 0.40.** Five defects, all structural:

1. **The sink was a name, not a binding.** `isFsWriteCall` required
   `callee.object.name === 'fs'` and the method list `['writeFileSync',
   'writeFile']`. Destructured requires, aliased imports, `node:fs/promises`,
   the `fs.promises` namespace, `appendFile*` and `createWriteStream` were all
   silent — six of the seven false negatives. Replaced with
   `resolveModuleBinding` (with `fs-extra`/`graceful-fs` as equivalents); the
   bare `fs.<fn>` receiver survives only as a fallback for files where `fs` is
   an unresolved global.
2. **Only `Literal` paths were seen.** `` `${os.tmpdir()}/report.csv` `` and
   `os.tmpdir() + '/state.json'` resolve to the same constant path as the
   `path.join` form and reported nothing.
3. **The mkdtemp remediation was reported.** `const PREFIX = path.join(os.tmpdir(),
   'ingest-')` handed to `fsp.mkdtemp` fired `predictableTempPath` — the rule
   reported the fix its own message prescribes. Now suppressed by resolving the
   consuming call, not by requiring the join to sit syntactically inside the
   mkdtemp argument list.
4. **The declarator was read instead of the last write.** `let dest =
   '/tmp/placeholder'; dest = path.join(root, 'dist', 'x'); write(dest)` was
   reported although the temp literal never reaches disk.
5. **Adversarial wave (100% → F1 0.846):** computed member access,
   `path.join('/tmp', …)`, `os.tmpdir()` concatenation and `fs-extra`'s
   `outputFile*` were four further misses, all fixed.

After: **TP 15, FP 0, FN 0 — P 1.00, R 1.00, F1 1.00.** Every fix has a lock in
`no-data-in-temp-storage.test.ts` that fails on the unfixed rule.
