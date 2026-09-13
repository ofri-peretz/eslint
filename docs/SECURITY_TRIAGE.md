# Security triage — open CodeQL alerts and open issues

A standing inventory of every open code-scanning alert and every open issue,
each with a **verdict** and the evidence behind it.

It exists because an alert count is not a risk measure. Twenty open alerts reads
as twenty problems; the substance here is that most of them are fixtures that
exist precisely to carry the defect they are flagged for, and dev-only scripts
with no privilege boundary to cross. Two are real and shipped. Saying which is
which, with the measurement, is the difference between a queue and a decision.

Snapshot: **2026-09-13** — 20 open alerts (13 high, 5 medium, 1 warning, 1 note),
3 open issues. Re-run the queries at the bottom to refresh.

> Scope note: CodeQL runs nightly only, not per-PR — see issue
> [#764](https://github.com/ofri-peretz/eslint/issues/764). Until that is fixed
> this file is the per-PR view.

## Verdicts used

| verdict       | meaning                                                                                                  |
| :------------ | :------------------------------------------------------------------------------------------------------- |
| **REAL**      | Ships to users, or runs on input we do not control. Fix it.                                              |
| **BY DESIGN** | The flagged construct is the point of the code. A fixture that does not carry the defect proves nothing. |
| **DEV-ONLY**  | Runs on a maintainer's own checkout, against the repo's own files. No attacker, no privilege boundary.   |
| **STALE**     | The condition that opened it no longer holds. Verify, then close.                                        |

---

## Shipped package code — the part that matters

Three alerts are in published packages. These are the only ones a consumer of
`@interlace/*` could ever be exposed to.

### `#1331` · high · `js/polynomial-redos` — **REAL**

`packages/eslint-devkit/src/ast/identifier-words.ts:52`

```js
.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // acronym boundary: XMLDoc -> XML|Doc
```

`[A-Z]+` backtracks when the trailing `[A-Z][a-z]` never matches. A linter reads
whatever source it is pointed at, so identifier length is not ours to bound.

Measured on Node 24, worst case (`"A".repeat(n)`, no lowercase tail):

| identifier length |     time |
| ----------------: | -------: |
|             1,000 |   0.9 ms |
|             5,000 |  19.6 ms |
|            20,000 |   216 ms |
|            50,000 | 1,532 ms |

Second-degree polynomial, confirmed by the curve rather than by reading the
pattern. Not exponential — a 50 KB identifier costs 1.5 s, not a hang — but it is
real, it is in shipped code, and generated or minified input can reach it.

**Action:** bound the quantifier or anchor the boundary so the acronym scan
cannot re-walk. Low urgency, genuine.

### `#1336` · note · `js/unneeded-defensive-code` — **REAL, trivial**

`packages/eslint-plugin-postgresql-security/src/rules/prevent-double-release/index.ts:449`

```ts
if (loop === undefined || loop === null) continue;
```

This file defines its **own** `findAncestor` (line 21), not the devkit's, and it
returns `T | null`:

```ts
function findAncestor<T extends TSESTree.Node>(
  node: TSESTree.Node | undefined,
  predicate: (n: TSESTree.Node) => n is T,
): T | null;
```

So `loop === undefined` can never be true — that is the dead disjunct, and
`loop === null` is the live, correct one. (The devkit exports a `findAncestor`
too, with the same `| null` return; neither can yield `undefined`.) Cosmetic, no
behaviour change either way.

### `#1340` · warning · `js/useless-assignment-to-local` — **REAL, cosmetic**

`packages/eslint-plugin-secure-coding/src/utils/redos-oracle.ts:98`

```ts
let survives = true;
try {
  survives = result.status !== 'safe';
} catch {
  survives = true;
} // "A pattern recheck cannot parse is not thereby safe."
```

Both paths assign, so the initialiser is dead. It is also the safe default being
stated twice on purpose, which is defensible on a security path. Leave or drop;
either is fine.

---

## ReDoS alerts in the ReDoS tests — **BY DESIGN**

### `#1327` · high · `js/redos`

`packages/eslint-devkit/src/ast/user-regex.test.ts:93`

```ts
const matchers = compileUserPatterns(['(a+)+$', '^secret'], 'i');
expect(matchers[0].mode).toBe('literal-catastrophic');
```

`(a+)+$` is the textbook catastrophic pattern, passed in deliberately to assert
that `compileUserPatterns` **refuses to compile it** and downgrades it to a
literal. The string is never turned into a live regex — the test's whole claim is
that it isn't. Removing the pattern would delete the coverage.

### `#1342`, `#1343` · high · `js/redos`

`packages/eslint-devkit/src/ast/does-not-ship-a-redos.test.ts:31`

These two are subtler and worth stating honestly: the flagged regex is not a
fixture, it is the test's own extractor —

```js
/\/((?:\\.|\[(?:\\.|[^\]])*\]|[^/\\])+)\/([gimsuy]*)/;
```

— which parses regex literals out of `user-regex.ts` so every probe is checked
automatically rather than from a copied list. It does run. Its input is this
repo's own source file, read from disk at test time; it is test-scope and not
shipped. Nested quantifiers are real, the reachable input is not attacker-supplied.

The file it lives in exists to police exactly this class, and says so:

> The ReDoS detector must not itself be a ReDoS. [...] A detector carrying the
> defect it detects is the fault this file exists to police.

**Action:** none required. If the extractor is ever pointed at untrusted input,
it becomes REAL.

---

## Dev-only scripts — **DEV-ONLY**

None of these run in CI against untrusted input or ship to a registry. They run
on a maintainer's checkout, against the repo's own files.

### `js/file-system-race` ×8 — **DEV-ONLY**

`scripts/prove-locks.mts:157,164,237` · `scripts/seal-audit.mts:642` ·
`scripts/case-ledger.mts:263` · `scripts/codemod-inert-suggestions.ts:150` ·
`scripts/add-sourced-fixture.mts:192` · `scripts/profile-test-durations.mts:110`

All are read-then-write on the repo's own tracked files. `prove-locks.mts` is the
clearest case — it is the mutation prover, so mutating a file and restoring it is
the function:

```ts
fs.writeFileSync(target, original.replace(proof.find, proof.replace));
try {
  stillPassing = lockPasses(lock.rel);
} finally {
  // ALWAYS put the file back, including on Ctrl-C mid-run
  fs.writeFileSync(target, original);
}
```

The TOCTOU window is between a maintainer and their own working tree. There is no
second principal to race.

### `#1337` · high · `js/regex-injection` — **DEV-ONLY**

`scripts/redos-classify.mts:85` — `new RegExp(source, flags)` where `source` is a
command-line argument. The script is a ReDoS classifier: compiling an
operator-supplied pattern and timing it _is_ what it does. Flagging it is flagging
its purpose.

### `#1358` · medium · `js/file-access-to-http` — **DEV-ONLY, mitigated**

`scripts/fetch-peer-health.ts:203`

```ts
const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(pkg)}`;
```

The package name comes from a manifest, so the taint is real, but the host is
hardcoded and the only interpolated segment is `encodeURIComponent`-escaped, so it
cannot escape the path or redirect the request.

---

## Workflow pinning — **BY DESIGN**

### `#1363`–`#1366` · medium · `PinnedDependenciesID`

`.github/workflows/eslint-version-matrix.yml:130,133,136,139`

```yaml
npm install --no-save -w @interlace/benchmarks eslint@^8
npm install --no-save -w @interlace/benchmarks eslint@9.39.0
npm install --no-save -w @interlace/benchmarks eslint@^9
npm install --no-save -w @interlace/benchmarks eslint@^10
```

A Scorecard check, not a CodeQL query. It asks for hash-pinned installs; this
workflow is the ESLint **version matrix**, whose entire job is to resolve floating
ranges and prove the plugins work across them. Pinning by hash would delete the
test. `9.39.0` is already exact.

---

## Open issues

| issue                                                                                | verdict            | evidence                                                                                                                                                                                                                                                                                                                                                                                  |
| :----------------------------------------------------------------------------------- | :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#916](https://github.com/ofri-peretz/eslint/issues/916) — sarif cannot be published | **STALE**          | `npm view @interlace/eslint-formatter-sarif version` → `0.2.0`. The package exists; the E404 token failure is resolved. Verify and close.                                                                                                                                                                                                                                                 |
| [#973](https://github.com/ofri-peretz/eslint/issues/973) — release pipeline stalled  | **STALE (verify)** | Both trigger conditions are clear: a Version Packages PR exists ([#989](https://github.com/ofri-peretz/eslint/pull/989)), and no package on `main` is ahead of npm — `secure-coding` 5.4.0, `operability` 4.1.3, `import-next` 2.7.8, `node-security` 5.5.0, `conventions` 6.0.0 all match their published latest. Filed before #989 existed. Re-run the check rather than closing blind. |
| [#764](https://github.com/ofri-peretz/eslint/issues/764) — CodeQL nightly only       | **REAL, open**     | Unrelated to the release chain. It is also why this file exists.                                                                                                                                                                                                                                                                                                                          |

---

## Summary

| bucket                                          | count | action                                             |
| :---------------------------------------------- | ----: | :------------------------------------------------- |
| REAL, shipped                                   |     3 | `#1331` worth fixing; `#1336`/`#1340` cosmetic     |
| BY DESIGN (fixtures, extractor, version matrix) |     7 | none — removing the construct removes the coverage |
| DEV-ONLY (scripts)                              |    10 | none while input stays the repo's own tree         |
| Issues stale                                    |     2 | verify, then close                                 |
| Issues real                                     |     1 | `#764`                                             |

One alert out of twenty warrants a code change on its merits.

## Refreshing this file

```bash
gh api "repos/ofri-peretz/eslint/code-scanning/alerts?state=open&per_page=100"
gh issue list --repo ofri-peretz/eslint --state open
```

Re-triage on change rather than on a schedule: a verdict here is only as good as
the code it was read against.
