---
slug: oxlint-plugin-security-drop-in
opened: 2026-10-25
packages:
  - oxlint-plugin-security
  - eslint-plugin-secure-coding
  - eslint-plugin-node-security
  - benchmarks
cases: []
---

# Intent — `oxlint-plugin-security`: a drop-in for eslint-plugin-security, gated by its own tests

**Status:** review · **Opened:** 2026-10-25 · **Owner:** @ofri-peretz

Decision record: [ADR 0008](../../adr/0008-oxlint-plugin-security-is-a-parity-gated-facade.md).
Spec: [`design.md`](./design.md). This repo calls the Stage 2 artifact `design.md`;
`AI_NATIVE_SDLC.md` calls it `spec.md`.

---

## What is wanted

An oxlint or Vite+ user, or an ESLint user, replaces `eslint-plugin-security` with
`oxlint-plugin-security` and changes nothing else:

- Every `security/<rule>` ID in their config resolves.
- Every finding the incumbent's own tests require is reported under the same ID.
- No new finding appears on code the incumbent's tests call clean, unless it is a
  divergence we have declared publicly, with a stated reason.

The package is published only once a CI check proves all three points against the
pinned incumbent version.

## Why now

- **The ecosystem is moving.** Vite+ 1.0 (VoidZero, 2026-09-28) bundles oxlint and
  tells users to drop ESLint plugins. `oxlint-plugin-security` was free on npm on
  2026-10-25.
- **The incumbent moved and our numbers didn't.** Measured 2026-10-25 against
  `eslint-plugin-security@4.2.0` (published 2026-10-01), using the published
  `eslint-plugin-secure-coding@5.4.17` and `eslint-plugin-node-security@5.6.12`:
  - 4.1.0 added a 15th rule, `detect-invisible-characters`, with 13 invalid test
    cases. We catch 0 of them.
  - The vendored corpus is still 4.0.1. It has 189 cases; 4.2.0 has 219.
- **The published parity number is stale, and nothing caught it.**
  `BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md` says 48/50 weighted, with both misses in
  `detect-non-literal-fs-filename`. Re-running `ilb-competitor-parity/run.mjs` today
  on the same 4.0.1 corpus gives a different picture:
  - Weighted parity is **49/51 (96.1%)**.
  - `detect-non-literal-fs-filename` is now **25/25**.
  - Both misses are `detect-possible-timing-attacks` (`password === 'mypass'` and its
    mirror). That class was 2/2 on 2026-08-13. It regressed when
    `no-timing-unsafe-compare` deliberately stopped reporting comparisons against a
    literal.

  No baseline is committed and no workflow runs the suite, so nothing noticed. A
  drop-in gate needs a check that runs.

- **The incumbent already runs under oxlint** (ADR 0008, fact 3). Being available is no
  reason to switch. The reason has to be measured quality on top of a floor of parity
  (PRINCIPLES rules 3 and 13).

## Affected users and systems

- New package `packages/oxlint-plugin-security`. It lands private.
- `eslint-plugin-node-security`:
  - one option on `no-timing-unsafe-compare`;
  - a fix for a false positive on bare `eval()` in `detect-eval-with-expression`.
- `eslint-plugin-secure-coding`:
  - a new rule, `no-invisible-characters`;
  - possibly the mustache rule's home (open question 1).
- `benchmarks/`:
  - the corpus is refreshed to 4.2.0;
  - `wont-fix.json` is corrected;
  - a new per-rule runner, `drop-in.mjs`;
  - a baseline is committed for `run.mjs`.
- CI: one new gate job and one weekly check for incumbent version drift.
- Published numbers in `docs/planning/BENCHMARK-VS-ESLINT-PLUGIN-SECURITY.md` change when
  the corpus moves to 4.2.0.
- The sibling intent `oxlint-native-plugin-names`: its alias generator must not claim
  `packages/oxlint-plugin-security`.

## Constraints

- **No duplicated rule logic.** The façade only re-exports or retires rules (ADR 0008,
  decision 2).
- **No change to any existing rule ID or `meta.name`.** ESLint↔oxlint rule-ID
  portability holds.
- **Nothing is published to npm and the name is not reserved** until the gate holds and
  Ofri accepts at Deploy. `release.yml` publishes every non-private `packages/*`, so
  the package stays `"private": true` until then.
- **A live defect can't be retired.** Only defects that can't occur on supported
  runtimes go to `wont-fix.json`.
- **The rule-design philosophy holds for the core rules.** A behaviour that exists only
  to match the incumbent goes behind an option that defaults off in the core rule and is
  pinned on by the façade. It never changes the core rule's default.
- **Zero external dependencies** beyond packages in this repo (PRINCIPLES rule 2).
  `eslint-plugin-security` is a devDependency, used only for the lock and the corpus.

## Success criteria

1. `node benchmarks/suites/ilb-competitor-parity/drop-in.mjs` exits 0 against
   `eslint-plugin-security@4.2.0`'s full corpus, under both ESLint and oxlint:
   - 15/15 IDs resolve;
   - 0 live misses;
   - 0 undeclared findings on valid cases.

   Today it would exit 1:
   - 15 live misses: 13 `detect-invisible-characters`, 2 `detect-possible-timing-attacks`;
   - plus 1 `detect-disable-mustache-escape`, unless it moves out of won't-fix;
   - 13 findings on valid cases with no declaration.

2. A control run, with the incumbent itself as the subject, scores 100% and 0 through
   the same harness. That proves the harness can pass.
3. The lock fails if `private` is `false` while (1) fails.
4. A weekly check opens an issue within 7 days of a new `eslint-plugin-security` version
   on npm.
5. At Deploy, the README's parity line, the raw number and the declined cases all match
   the gate's output byte for byte.

## Open questions

1. **Where does `detect-disable-mustache-escape` live?** `wont-fix.json` declines it on
   taxonomy grounds ("a deferred home, not a rejected defect"). It is a live CWE-79
   defect, though, so a drop-in can't retire it.
   **Recommended:** `secure-coding/no-disabled-template-escaping`, overriding that note.
   Disabling escaping is a sink setting that doesn't depend on the engine. The
   alternative is a template-engine plugin that doesn't exist yet. Until one of these is
   decided, the gate stays red on this one case.
2. **Should the façade reproduce the incumbent's literal-comparand timing finding?**
   **Recommended:** yes, behind a new option `reportLiteralComparands` on
   `node-security/no-timing-unsafe-compare`:
   - It defaults to `false`, so node-security keeps its measured precision.
   - The façade pins it to `true` through `meta.defaultOptions`.
   - The façade's users already had exactly this behaviour from the incumbent, so they
     see no new noise.

   The alternative is declining both cases in `wont-fix.json`. That would be the only
   declined live code shape, so it needs Ofri's explicit call.

3. **Are the declared divergences acceptable as stricter-than-incumbent findings?** They
   are:
   - `spawn(str)`: 11 valid cases. Running a non-literal command is CWE-78, whatever the
     `shell` setting.
   - `new Buffer('test')`: 1 valid case. `new Buffer` is DEP0005 for any argument.

   **Recommended:** yes. Declare them in `divergences.json` and state them in the README.

4. **Should eslint-community maintainers be told before the first publish?** This is
   outward-facing, so it is Ofri's call at Deploy.
