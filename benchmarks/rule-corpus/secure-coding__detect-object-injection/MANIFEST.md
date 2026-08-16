# Rule corpus — `secure-coding/detect-object-injection` (CWE-915)

**The question this corpus exists to answer:** `eslint-plugin-security`'s
`detect-object-injection` is the most-disabled rule in the most-installed
security plugin on npm — it reports *every* `obj[identifier]` in a file,
including `arr[i]`. Our port keeps the name and claims to have replaced the
heuristic with evidence. This corpus asks whether that claim survives contact
with code that was written to break it.

Their whole implementation is: visit `MemberExpression`, report if
`computed === true && property.type === 'Identifier'`. Two things follow, and
this corpus tests both directions:

- **They over-report.** Any numeric index, any allowlist-guarded write, any
  constant-table read is a finding.
- **They under-report.** A key that is not a bare identifier —
  `settings[req.body.key]`, `obj['__proto__']` — has `property.type !==
  'Identifier'` and is invisible. So is `Object.assign(target, req.body)`, which
  is the same primitive with the loop written for you, and so is the dynamic
  method dispatch that CWE-915 explicitly covers.

## Scores

`RESULTS.json` is the verbatim output of
`benchmarks/suites/ilb-rule-duel/run.mjs`. That harness's `COMPETITORS` map has
no entry for this rule id, so it scores only our rule; the competitor row below
was produced separately with the identical file-level scoring contract
(`eslint-plugin-security@latest`, `detect-object-injection`, default options,
same 19 files). **Adding a `COMPETITORS` entry for this rule id would fold that
row into `RESULTS.json` and is worth doing** — this worker was scoped out of
`benchmarks/suites/`.

| Plugin | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Interlace `secure-coding/detect-object-injection` | 10 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| `eslint-plugin-security/detect-object-injection` | 7 | 6 | 3 | 53.8% | 70.0% | **60.9%** |

Their misses: `01-express-settings-write` (key is a MemberExpression, not an
Identifier), `05-object-assign-request-body`, `07-dynamic-handler-dispatch`.
Their false positives: six of the nine safe fixtures, including the array index
loop, the allowlist guard and the constant lookup table — i.e. three of the
documented *remediations* for this CWE.

## What the adversarial wave cost, and bought

The first wave (7 vulnerable / 6 safe) scored **93.3% F1** — one FP straight
away. Three more fixtures aimed at the rule's seams took it to **76.2%**
(TP 8 / FP 3 / FN 2). Four defects, all fixed and locked:

| # | Fixture | Defect | Fix |
|---|---|---|---|
| 1 | `safe/05-hasown-guard.js` | FP — `if (!Object.hasOwn(record, column)) return null;` was not recognised as a guard. The `!` unwrap lived *inside* `isIncludesCall`, so `ALLOWED.includes(k)` was understood negated and un-negated while `hasOwn` and `k in o` were understood only un-negated | the unwrap moved up to `hasValidation`, where it applies to every validation form once. `!guard() → return` excludes exactly the keys `guard() → proceed` admits |
| 2 | `vulnerable/08-camelcase-suffix-key.js` | **FN, decided by spelling.** `counters[eventType] = 1` with `const eventType = req.body.type` was silent because the name ends in `Type`; rename it `eventName` and the identical program reports | the two name-shaped suppressions are now defeated whenever the identifier resolves to a declaration with a **visible initialiser that is provably not build-time constant** (`isStaticExpression`). Evidence beats the convention wherever evidence exists |
| 3 | `vulnerable/09-screaming-snake-key.js` | **FN, decided by spelling.** `overrides[FLAG_NAME] = …` with `const FLAG_NAME = req.body.flag` was silent because `/^[A-Z][A-Z0-9_]{2,}$/` matched | same fix as #2 |
| 4 | `safe/07-object-keys-foreach.js` | FP — `Object.keys(x).forEach((k) => x[k])`. `for (const k in x)` and `for (const k of Object.keys(x))` were both already quiet; the third and most common spelling of the same own-keys guarantee reported | `isForInOrObjectKeysKey` now also clears a callback's first parameter when the callback is the argument of an element-first iterator (`forEach`/`map`/`filter`/`find`/`findLast`/`some`/`every`/`flatMap`) on `Object.keys(...)` / `Object.entries(...)` |
| 5 | `safe/09-buffer-offset-arithmetic.js` | FP — `samples[frameStart + frame * stride + channel]`, all parameters. `+` was only cleared when BOTH ends were provably numeric | a `+` chain containing any provably-numeric operand cannot equal a dangerous name: the result must contain that number's rendering as a contiguous substring, and every `String(number)` (`NaN`, `Infinity`, `-0`, `1e+21` included) contains one of `[0-9NI]`, none of which appears in `__proto__`, `prototype` or `constructor`. Scoped to the configured `dangerousProperties`, so adding `slot0` correctly restores the finding |

Fixes #2 and #3 are the important ones. They are the repo's first-listed defect
class — a rule deciding by a name — in the **suppress** direction, where being
wrong means a missed vulnerability rather than a false alarm.

`vulnerable/10-innocuous-identifier-names.js` is fixture 02 with every identifier
renamed to a word carrying no security connotation, and must keep reporting.

## Narrowed, not removed

The suppressions in #2/#3 were added to close real NestJS-metadata false
positives. They still apply when there is **no visible initialiser** — a
parameter, an import, an ambient binding — which is what those cases are, so
nothing that was quiet before this change starts reporting. The narrowing only
removes the suppression where the rule can read the initialiser and the
initialiser says the value came from outside the program.

The full removal of both regexes is still the target state: they are name
inference behind a `RegExp.test` rather than a `String.includes`, which is why
`npm run lint:name-inference` does not see them (its detector matches
`.includes` / `indexOf` / `search` / `match`, and a four-plus literal vocabulary
fed to `.some`). **That is a third gate-evasion shape worth closing.**
