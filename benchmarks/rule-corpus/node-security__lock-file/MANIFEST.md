# Rule corpus — `node-security/lock-file` (CWE-829)

Written from CWE-829 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

## Verdict: UNMEASURABLE-BY-HARNESS (the rule itself is healthy)

This is the highest-value finding in this corpus directory, and it is **not**
the same as "the rule is vacuous". The rule works. It simply cannot be scored
by a per-file duel, because **it does not read the file**.

`lock-file` registers exactly one visitor, `Program`, and uses that node only
as somewhere to attach the report. The verdict comes from the filesystem:

```ts
const found = findUpward(path.dirname(context.filename), targetLockFiles) !== undefined;
```

The duel harness lints each fixture with `path.basename(file)` as the filename
(`benchmarks/suites/ilb-rule-duel/run.mjs`), so `path.dirname` is `.` and the
walk starts at the process cwd — this repository, which commits a
`package-lock.json`. Every fixture is therefore quiet, and no fixture CONTENT
can change that. There is no honest `vulnerable/` file to write, so
`vulnerable/` is deliberately empty and the duel prints `0 / 0 / 0`. That zero
is the finding, not a score.

## The positive control

A quiet probe proves nothing without one. `MEASUREMENT-PROBE.mts` in this
directory builds real project directories in a temp dir and lints real paths
inside them (run it with `npx tsx`):

| # | Setup | Result |
|---|---|---|
| 1 | `package.json`, **no** lock file, real path | **1 report** ← positive control |
| 2 | same project, SECOND file | 0 reports — module-scope `reportedRoots` |
| 3 | no lock file, file is **empty** | **1 report** — content is never read |
| 4 | lock file present | 0 reports — correct |
| 5 | no `package.json` anywhere above | 0 reports — correct, not a JS project |
| 6 | filename = `basename` (what the duel does) | 0 reports — walk starts at cwd |

Case 1 versus case 4 changes exactly one thing — the lock file appears — and
the verdict flips, so the rule is doing its job. Case 3 versus case 1 changes
the entire file to nothing and the verdict does not move, which is the proof
that a per-file corpus cannot grade this rule.

The probe's own first draft is a warning worth keeping: with a cwd-less
`Linter` and a `files: ['**/*.js']` glob, every call returned one message
reading *"No matching configuration found"* with `ruleId: null`, and counting
messages scored that config error as a detection — a silent failure that looked
like a clean 6-for-6. It now throws on any message without a `ruleId`.

## Two properties worth recording

1. **`reportedRoots` is module scope and is never cleared.** That is deliberate
   — it replaced a per-`create()` guard that produced 135 identical findings on
   auth0/express-openid-connect — but it makes the rule's output
   **order-dependent and non-idempotent within one process**: the second lint
   pass in a long-lived ESLint server reports nothing, and in any corpus the
   first fixture would absorb the only available finding. Not changed here:
   reverting it restores a worse defect.
2. **A `.js`/`.ts` corpus is the wrong instrument for this CWE.** CWE-829 is a
   property of a project, not of a file. Grading it needs a *project*-level
   harness — a fixture directory with a manifest and with/without a lock file —
   which is what `MEASUREMENT-PROBE.mts` improvises.

## Fixtures

`vulnerable/` — **empty by design.** No JavaScript or TypeScript file content
can make this rule report; writing one would be manufacturing a score.

`safe/` — realistic Node files, all correctly quiet because this repository
commits a lock file. Each header says plainly that its verdict comes from the
filesystem and not from its own contents.

| File | Shape |
|---|---|
| `01-server-bootstrap.js` | Express app bootstrap |
| `02-cli-entry-point.js` | CommonJS CLI with `parseArgs` |
| `03-build-script.ts` | TypeScript build script (same non-evidence, other parser) |
| `04-postinstall-hook.js` | postinstall hook — where a missing lock file hurts most |

## What this corpus proved

- The rule is **correct** on real paths: it fires with no lock file, stays quiet
  with one, and abstains where there is no `package.json` at all.
- The rule is **unmeasurable** by the per-file duel harness, and would be
  unmeasurable by any harness that passes a bare basename.
- The rule's finding is **capped at one per process**, so even a project-level
  corpus must lint each fixture project in a fresh process.
