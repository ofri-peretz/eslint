# Getting a rule to the bar — the process, end to end

Written after taking `node-security/detect-non-literal-fs-filename` from 37
false-positive-dominated findings to 1 true positive, and after measuring
`no-redos-vulnerable-regex` out of the presets. Every step here exists because
skipping it produced a wrong answer at least once.

**One rule at a time.** The measurement is per-rule; a mixed sample is not any
rule's precision.

---

## 0. Before touching the rule

```bash
source ~/.nvm/nvm.sh && nvm use 24        # every command. Node 24 only.
npx turbo run build --filter=<the-plugin> # the runners load dist, not src
```

Read the rule's LOCK header if it has one, and its corpus `MANIFEST.md`. The
header records decisions that look wrong and are not — most of them were made
against a measurement.

## 1. Establish what tier it ships at, and therefore its bar

```bash
node -e "const p=require('./packages/<plugin>/dist/src/index.js');
console.log(p.configs.recommended.rules['<prefix>/<rule>'] ?? 'NOT IN recommended')"
```

| Ships at | Bar | Sample needed |
| :--- | :--- | :--- |
| `error` | ≥95% | n ≥ 73 clean, or n ≥ 150 with one FP |
| `warn` | ≥70% | n ≥ 9 clean |
| opt-in | no floor, rate published | any, published |

If the rule's TOTAL output on the corpus is smaller than that `n`, the **census
criterion** applies: label every finding, pass at zero false positives. A rule
does not choose — the count decides.

## 2. Measure it on real code, before changing anything

```bash
node benchmarks/suites/ilb-real-source/run.mjs --allow-local \
  --sample=40 --sample-rules=<prefix>/<rule>
```

`--sample-rules` force-enables the rule even if it is outside `recommended`.
Without it a preset-based run never switches it on, and **absence reads as
silence** — that mistake got published once.

The runner refuses to start if `src` is newer than `dist`. That gate exists
because two 15-minute runs came back byte-identical across a real fix.

## 3. Label every finding, with a reason

Not a percentage — a table with file, line, verdict and why. Timing beats
reading wherever the claim is about runtime: `scripts/redos-classify.mts` is the
worked example, and it found 6 real findings the naive sweep had missed.

**Diagnose against the cached file, never a reduction of it.**

```bash
# the rule reports here, so lint THIS
benchmarks/.real-source-cache/<org>__<repo>/<path>
```

Three fixes this session passed all their tests and changed nothing at the real
site, because the reduction omitted the detail that mattered. Write the reduction
for the test suite AFTER the real file is confirmed fixed.

## 4. Group the false positives into classes

One class, one fix. `detect-non-literal-fs-filename` had four:

| Class | Fix |
| :--- | :--- |
| literal `../` paths | ask where the path ARRIVES, not whether it contains dots |
| `process.pid` as taint | limit the `process` root to members an invoker controls |
| `ctx`/`context` by name | require evidence — a request-surface member access |
| taint as the base | a segment cannot escape a base the invoker named |

If a class is "the rule reports unless it can prove safety", that is a contract
question, not a patch. Stop and ask.

## 5. Test first, and check the test fails

```bash
npx vitest run <rule-dir>/<new>.test.ts    # MUST fail before the fix
```

Every valid case needs an invalid CONTROL beside it, or "quiet" passes on a rule
that reports nothing at all. Every guard needs a case where it must NOT fire.

## 6. Fix, then re-run every gate in the same session

```bash
npx vitest run --coverage                                   # 100%, from inside the package dir
npx tsx benchmarks/suites/ilb-rule-duel/run.mjs <prefix>/<rule>   # recall must not move
npx tsx scripts/rule-seal-probe.mts <prefix>/<rule>              # 9/9
npx tsx scripts/rule-audit-gate.ts                               # no new findings
npx turbo run build --filter=<plugin> && <re-run step 2>         # the number that matters
```

Coverage falling is a signal, not an obstacle: three times this session it
pointed at a branch the fix had orphaned or a guard nothing exercised.

## 7. If it still misses the bar

Demotion is the stopgap that protects a consumer today; it is not the
resolution. A rule below its tier's bar is an open defect. If its measured
precision supports no tier at all, it leaves the presets and stays exported —
`detect-non-literal-regexp` (2026-08-12) and `no-redos-vulnerable-regex`
(2026-08-18) both did, each with the measurement in the comment and a lock test
so it cannot drift back.

## 8. Record it

`benchmarks/RULE-SCORES.md` — one row per measurement RUN, with its command.
Then the plugin's preset comment, and a lock test for any preset change.

---

## Traps that have each cost a session

- **A quiet probe proves nothing without a positive control.** Prove the rule
  REPORTS on the shape first.
- **`files: ['**/*']` does not make a flat config apply.** ESLint answers with a
  `ruleId: null` message that a naive probe counts as a finding.
- **Fix the ESM form, miss the CJS one.** Both real sites were `require()`.
- **`git add <dir>` sweeps in another session's files.** Stage explicit paths and
  verify with `git log -S "<distinctive string>"` after committing.
- **A comment containing a colon inside a `meta` block** becomes a phantom
  messageId or option in `rule-audit.ts`.
- **A corpus timed at fixed n hides polynomial behaviour.** Pump the input.

---

## The order for the remaining work

Ranked by findings on the 20-repo corpus, because that is what a consumer sees.
Loudest first is also cheapest first: one fix moves thousands of findings.

| # | Rule | Findings | Sampled | Status |
| ---: | :--- | ---: | :--- | :--- |
| 7 | `secure-coding/no-unlimited-resource-allocation` | 173 → **3** | 3/3 TP | **done** 2026-08-18 (`abc9fb1e2`) |
| 8 | `node-security/no-toctou-vulnerability` | 59 | ~0 TP | **measured, fix written, NOT shipped** — see below |
| 5 | `secure-coding/no-improper-type-validation` | 2,392 | — | second loudest, never measured |
| 6 | `secure-coding/no-insecure-comparison` | 1,830 | — | third loudest, never measured |
| 9 | `secure-coding/no-unchecked-loop-condition` | 435 | — | fourth loudest |
| 10 | `secure-coding/no-missing-authentication` | 366 | — | fifth loudest; already flagged by the audit |

5 and 6 are louder than 7 and 8 were, but opt-in exposure is unknown until
measured — check their tier first (step 1). Start each at step 0.

### Waiting on a decision — `node-security/no-toctou-vulnerability`

Ships at **`error` in `recommended`**. 59 findings on the 20-repo corpus, of
which one is a true positive. Measured and diagnosed 2026-08-18; the fix is
written and reverted, because it is a contract change rather than a patch.

**The disagreement.** All 16 `vulnerable/` fixtures in the rule's corpus are
rooted at `os.tmpdir()` or a literal `/tmp` path, and say why in their headers:
a check/use window is exploitable only where a second party can act inside it.
The implementation asks the opposite question — it exempts paths reaching a
per-user root and reports everything else — and ~15 unit cases assert that
direction on purpose (`const p = notAFunction(); if (existsSync(p)) unlinkSync(p)`
is invalid today *because* the path does not resolve).

The corpus and the tests contradict each other. The measurement says the corpus
is right: what the current direction actually reports is build and release
tooling operating on its own checkout.

**The fix, measured.** Require the shared root to be provable — mirror
`reachesPerUserRoot` as `reachesSharedRoot`, with the same walk plus a string-
Literal arm, over:

```
SHARED_ROOT_FUNCTIONS   tmpdir
SHARED_ENV_VARS         TMPDIR, TMP, TEMP
SHARED_LITERAL_ROOTS    /tmp, /var/tmp, /dev/shm, /var/folders/,
                        C:\Windows\Temp, C:\Temp
```

and one line in `checkCallExpression`, after the existing per-user exemption:

```ts
if (!reachesSharedRoot(useArg)) return;
```

| | findings on 20 repos | corpus F1 |
| :--- | ---: | ---: |
| as shipped | 59 | 100% |
| requiring a shared root | **1** — n8n `test-schema-setup.ts:73`, a real one | 100% |

**Two things to decide.** First, whether an unresolvable path should report:
today it does, and that is where the 59 come from. Second, whether two corpus
fixtures may name the shared path they already describe —
`09-cast-at-the-use.ts` and `16-nonnull-assertion.ts` both say "the shared
scratch file" / "the shared export artefact" in their comments but build the
path from an unresolvable parameter, so they are the only two that would stop
reporting. Their stated subject is cast and non-null-assertion unwrapping,
which is unaffected either way.

### Deferred, deliberately

`secure-coding/detect-object-injection` — 14,696 findings, 0 TP / 13 FP, the
single largest contributor to ecosystem noise. It is NOT a step-4 patch: its
final branch is `return true`, i.e. report unless proven safe, and its own
corpus encodes that decision (`10-innocuous-identifier-names.js` exists to prove
the rule does not rely on names, and passes only because unprovable keys are
reported). Inverting it to require attacker-reachability would break that
fixture.

That is a contract change worth its own session with Ofri, not an overnight fix.
