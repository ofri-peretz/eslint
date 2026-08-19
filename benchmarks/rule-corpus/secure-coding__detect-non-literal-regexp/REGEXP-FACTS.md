# What a non-literal `RegExp` actually is, executed on Node 24

Measured 2026-08-19 over the 20-repository corpus: **176 findings across 112
distinct cases.** Every single one carries the same messageId — `regexpReDoS`.

That is the first thing to settle, because it is not a tuning question.

## The rule proves "not a literal" and reports "ReDoS"

`detect-non-literal-regexp` establishes that a pattern is not a literal. Its
message tells the reader the pattern is vulnerable to catastrophic backtracking.
Those are different claims, and the second does not follow from the first:
`new RegExp(escapeRegExp(name))` is not a literal and cannot backtrack
catastrophically, while `/(x+x+)+y/` is a literal and does.

The ecosystem already has a rule that establishes the second claim properly.
`no-redos-vulnerable-regex` decides it with `recheck`, an independent oracle, at
98.1% precision. A rule that asserts the same weakness without the oracle is not
a second opinion — it is the same claim with the evidence removed.

## Class B: cloning a RegExp, 7 cases / 10 findings

```js
const ret = new RegExp(regexp.source, regexp.flags);   // Automattic/mongoose
const regexp = new RegExp(source.source, source.flags); // webpack/webpack
const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g'); // n8n-io/n8n
```

`.source` is a string the **engine** produced from an already-compiled RegExp,
not one a caller supplied. Cloning cannot introduce backtracking the original
did not have. Executed against the oracle rather than argued:

```
  /(x+x+)+y/        original=vulnerable  clone=vulnerable  IDENTICAL
  /^\d+$/           original=safe        clone=safe        IDENTICAL
  /(a|a)*b/i        original=vulnerable  clone=vulnerable  IDENTICAL
  /^[a-z]{1,10}$/gm original=safe        clone=safe        IDENTICAL
```

4/4 byte-identical, oracle verdict included. So a finding here is one of two
things, and neither is useful: a **duplicate**, when the original is a literal in
the same file that `no-redos-vulnerable-regex` already reports; or a
**misattribution**, pointing the reader at the copy instead of the pattern.

The probe is `scripts/` — reproduce with the snippet above under `recheck`.

### What is deliberately NOT exempted

`new RegExp(re.source + '$', re.flags)` — nestjs/nest — is concatenation, not a
clone. Appending a literal is usually harmless, but a literal may itself carry a
quantifier (`re.source + '+'`), and "usually" is not a contract. Only the pure
`X.source` form is provably a clone, so only that form is claimed.

## Class A: escaped interpolation, 12 cases / 24 findings — a NAMED dead end

```js
new RegExp(`{{\\s*?${escapeStringRegexp(relationVar)}\\s*?}}`)  // directus
new RegExp(escapeRegex(query), ignoreCase ? 'i' : '')           // n8n
new RegExp(`^#{1,3} ${escVersion}(\\s|$)`, 'm')                 // knex
```

If the interpolated text is escaped, it contributes no metacharacter, so it
cannot add a quantifier or an alternation and cannot create backtracking the
surrounding literal did not already have. That reasoning is sound and the class
is real — and this rule **cannot act on it**, for a reason worth naming rather
than working around.

Recognising these means deciding from the callee's NAME: `escapeRegExp`,
`escapeStringRegexp`, `escapeRegex`, `escVersion`. That is precisely the defect
`lint:name-inference` exists to gate, and the doctrine is not negotiable for
convenience — a project with a helper called `escapeRegExp` that does not escape
would be silently unprotected, and one whose escaper is called `q` gets no
credit. The evidence-based version requires knowing what the function RETURNS,
which is interprocedural: **L1**.

Recorded as a known gap, not fixed by an allowlist.

## Class C: the remainder, 93 cases / 142 findings

```js
const regex = new RegExp(keyword, "i");        // louislam/uptime-kuma
const re = new RegExp(grader.pattern, 'i');    // n8n-io/n8n
return new RegExp(String(value));              // directus/directus
new RegExp(sch.regex)                          // Unitech/pm2
```

These are genuinely non-literal and the rule is correct about that. Whether each
is *actionable* is the effective-FP question and is not answered here — it needs
the reachability work the seal record already lists as unmet.

## Corpus hygiene

32 of the 176 findings (14 of 112 cases) land in vendored or bundled files —
`.yarn/releases/yarn-4.13.0.cjs` and similar. No consumer edits those. They
should not count toward a precision figure in either direction, and they are
excluded from the class counts above where they were the only example.

## Reachability triage — and why it is triage, not a measurement

The seal record lists `reachability` unmet for this rule and for all 93 others.
This is a first look at how large that gap is, run against the checkouts in
`benchmarks/.real-source-cache` by asking, for each case, what the pattern
argument is bound to **within its own file**:

```
untrusted         7 cases    12 findings   6.8%
interpolated     91 cases   140 findings  79.5%
boundToLiteral    1 cases     1 findings   0.6%
moduleConst       4 cases     8 findings   4.5%
param             5 cases     9 findings   5.1%
noBinding         4 cases     6 findings   3.4%
```

**What this says:** at most 6.8% of findings have attacker provenance that is
demonstrable without leaving the file.

**What it does NOT say:** that the other 93% are false. `interpolated` — four
findings in five — means the argument is a template or a concatenation, and the
triage did not resolve what it interpolates. That is unresolved, not safe.
Reporting it as a false-positive rate would be the same error as the throughput
gate calling a parse error "linear".

The first version of this triage returned **1** untrusted case; this one returns
7, the difference being whether the untrusted marker is looked for on the call
line as well as in the binding. Two crude passes disagreeing sevenfold is the
finding: a regex over source cannot settle provenance, which is exactly the
`textual-matching` defect the rule audit reports on rules. It is recorded here to
size the work, and it is not evidence for changing any verdict.

A real answer needs the argument resolved through the scope chain to a source,
which for the `param` and most `interpolated` cases means crossing a function
boundary: **L1**.

## The partition, stated

Three rules construct findings about the same expression, and all three are
currently stamped **CWE-400**, two of them saying "ReDoS":

| rule | claim | evidence it has |
|---|---|---|
| `no-redos-vulnerable-regex` | this pattern backtracks catastrophically | `recheck`, an independent oracle |
| `no-unsafe-regex-construction` | untrusted input reaches a regex unescaped | a resolved path from a source |
| `detect-non-literal-regexp` | the pattern is decided at runtime | the argument is not a literal |

Probed rather than assumed — `new RegExp(req.query.p)` draws **two** reports,
not three:

```
detect-non-literal-regexp   [regexpReDoS]            ReDoS vulnerability detected | HIGH
no-unsafe-regex-construction [unsafeRegexConstruction] User input in regex without escaping
                                                      Fix: input.replace(/[.*+?^${}(...
```

`no-redos-vulnerable-regex` correctly stays silent: it cannot prove this pattern
backtracks, so it does not say so. That is the rule behaving exactly as designed,
and it isolates the partition failure to the other two.

Of the two that do fire, the second names the weakness it proved and hands over a
fix. The first names a weakness it did not prove and offers nothing the second
does not. On this expression it is pure noise, and it is why the `partition` axis
is recorded as failed.

The first two claims are proven by their rules. The third is not a vulnerability
claim at all — "I cannot see this pattern from here" is an auditability
statement. Upstream `eslint-plugin-security` hedges it as *might* allow a DoS;
ours drops the hedge and asserts `issueName: 'ReDoS vulnerability'`, which is the
one thing it has no evidence for.

So the split, in the order a reader should get them:

1. If the pattern is statically known and the oracle says it backtracks →
   `no-redos-vulnerable-regex`. It has proof.
2. Else if untrusted input reaches the constructor →
   `no-unsafe-regex-construction`. It has a path.
3. Else the pattern is merely runtime-decided → `detect-non-literal-regexp`,
   saying that and nothing more.

Parity with `eslint-plugin-security` requires keeping rule 3; being better than
it means rule 3 stops claiming a weakness it has not established, and stops
firing on the clone class above, which upstream also flags.

## The duel scores 100% on a corpus that cannot see any of this

`SEAL.json` records the duel as met: 15 TP / 0 FP / 0 FN, 100% precision, 100%
recall, 100% F1. All 30 fixtures were checked for the clone form and **none uses
it** — the single `.source` in `vulnerable/08-global-namespaced-constructor.js`
is a logging call, not a construction.

So the corpus cannot fail on the class this document is about. Nor on the escape
class. The 100% is real and it is also uninformative: it measures agreement with
fixtures we wrote, on the shapes we already knew about, which is why the
real-source sweep and not the duel is what found these.

The fixtures owe three additions before the duel means anything here: the pure
clone, the escaped interpolation, and a runtime-decided pattern with no untrusted
provenance. Adding them will move the published score, which is the point —
`benchmarks/corpus` is a calibrated instrument and changing it restates the
numbers, so it happens deliberately and gets recorded, not quietly.

## Restated numbers, 2026-08-19

`safe/10-cloned-regexp.js` was added so the duel can see the clone class at all.
Adding a fixture to a calibrated corpus republishes every score computed from it,
so the change is recorded here rather than left to be discovered in a diff:

| | before | after |
|---|---|---|
| Interlace | 15 TP / 0 FP / 0 FN — 100.0% F1 | 15 TP / 0 FP / 0 FN — 100.0% F1 |
| eslint-plugin-security | 12 TP / 7 FP / 3 FN — 70.6% F1 | 12 TP / **8** FP / 3 FN — **68.6%** F1 |

Ours is unchanged because the clone exemption landed first; upstream picks up one
more false positive because it flags the clone. The gap widens for a reason that
is about the fixture, not about either rule getting better, and saying so is the
point of writing it down.

Real-source effect of the exemption, measured on the same 20 repositories:
**249 → 245 findings.** Five sites in the corpus construct from a `.source`;
four are pure clones and are now silent (mongoose `clone.js`, webpack
`AnalyzableChunkHashPlugin.js` and `syntax.js`, n8n `placeholder.ts`), and the
fifth is nestjs's `new RegExp(re.source + '$', re.flags)`, which is
concatenation and keeps its finding deliberately. Four sites, four findings —
the arithmetic closes, which is how the change is attributable rather than
merely coincident with a smaller number.
