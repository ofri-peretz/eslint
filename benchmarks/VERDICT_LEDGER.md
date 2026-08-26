# Verdict ledger

Every verdict this project has rendered against **real third-party code**, with
the repository, file and line that produced it, so any entry can be re-checked
rather than taken on trust.

Machine-readable in `VERDICT_LEDGER.json`. Definitions are the ordinary ones:

| | meaning |
| :--- | :--- |
| **TP** | we reported a defect and it was real |
| **FP** | we reported something that was not a defect |
| **TN** | code we correctly stayed silent on — pinned as a `safe/` fixture |
| **FN** | a defect we missed |

**Current: 6 TP · 10 FP · 0 FN identified.** The false positives represent
**1,069 findings** in the wild.

That ratio is not a scandal, it is the first honest count. Before 2026-08-26 the
scored corpus contained exactly one false positive, because nobody had looked
at real code — and the benchmark that would have told us could not run at all
(see the two commits that repaired `benchmarks/score.ts`). A corpus with no
false positives is an unexamined one.

## FN is empty, and that is a gap not an achievement

Nothing here records a defect we missed, because our method cannot find one. We
scan code, look at what we reported, and judge it. A vulnerability no rule fires
on produces no finding to review, so it never enters this table.

Closing that needs a different instrument: a corpus with independently-known
ground truth (a CVE set, or code another scanner flags and we do not). Until
then, recall numbers rest on fixtures we wrote ourselves, and should be read
that way.

## False positives

| id | rule | shape | in the wild | status |
| :--- | :--- | :--- | ---: | :--- |
| FP-001 | `no-zip-slip` | `.extract()` on a non-archive | 6 | **fixed** (#727) |
| FP-002 | `no-timing-unsafe-compare` | `node.kind === SyntaxKind.X` | 11 | **fixed** (#727) |
| FP-003 | `no-insecure-comparison` | `if (e.code == 'MODULE_NOT_FOUND')` | 140 | **configurable** |
| FP-004 | `require-secure-credential-storage` | `TOKEN_SIGNING_ALG = 'RS256'` | 110 | **fixed** |
| FP-005 | `no-innerhtml` | `DOMPurify?.sanitize(h) ?? h` | 21 | parked |
| FP-006 | `no-hardcoded-credentials` | TypeORM migration `name` | 20 | parked |
| FP-007 | `jwt/require-issuer-validation` ×3 | minimal `jwt.verify` | — | open |
| FP-008 | `pg/no-transaction-on-pool` | hardcoded identifier `pool` | — | open |
| FP-009 | `no-unsafe-regex-construction` | `new RegExp(node.pattern, node.flags)` | 11 | open |
| FP-010 | `detect-object-injection` | computed-key **write**, key locally derived | ~750 | characterised |
| FP-011 | `no-unhandled-promise` (×2 plugins) | every call treated as a promise | **11,866** | **fixed** |
| FP-012 | `no-magic-numbers` | a number already named, and a number that is data | 536 | **fixed** |
| FP-013 | `consistent-function-scoping` | a function passed as an argument | 1,270 | **fixed** |
| FN-001 | `consistent-function-scoping` | every arrow and function-expression helper | — | **fixed** |

`detect-object-injection` alone is six of the top eleven clusters. It is the
largest single block of unexamined findings we have, and it is one rule.

## True positives

Each was verified by reading the code, not by trusting the finding, and each is
now an open pull request on the project it affects.

| id | rule | where | what it gates |
| :--- | :--- | :--- | :--- |
| TP-001 | `no-timing-unsafe-compare` | eclipse-theia/theia-cloud | five HTTP endpoints behind one bearer check |
| TP-002 | `no-math-random-crypto` | telepat-io/otto | the pairing code that claims a challenge |
| TP-003 | `no-timing-unsafe-compare` | telepat-io/otto | controller registration, the privileged role |
| TP-004 | `no-timing-unsafe-compare` | humanprotocol/human-protocol | a KYC webhook signature |
| TP-005 | `no-zip-slip` | nwutils/getter | symlink targets written from archive bytes |
| TP-006 | `no-permissive-trust-proxy` | cncjs/cncjs | an IP allowlist — disclosure drafted, unsent |

TP-005 is worth reading as a method note. The first read looked like four
holes; building actual malicious zips and running them against unmodified
`main` showed yauzl already refused three of them, and only the symlink target
escaped. The PR says so, with the table.

## How an entry is closed

A false positive is not closed when the rule stops firing. It is closed when a
fixture exists that **fails on the unfixed rule and passes on the fixed one** —
the standard this repo already applies to bugs. Fixtures carry `@source` naming
the real file they came from, and `@sealed` naming the rule they hold down.

Entries marked *parked* have a reproduction in
`benchmarks/corpus/_pending-rule-fix/` and are deliberately not scored: the
per-CWE false-positive budget is zero, and raising a budget to accept a known
defect is how it becomes permanent.


## FP-010 — why this one took so long, and what it actually is

`detect-object-injection` resisted triage for a reason that had nothing to do
with the rule. The case ledger files its findings under a shape signature, and
for this rule that produced **4,286 distinct shapes**, none of which is a
decision anybody can make: `Mem(Id[Id])` is `paths[i]`, `Assign=(Mem(Id[Id]),Id)`
is `fields[field] = include`. Adjudicating 4,286 of those is not work, it is a
treadmill.

Running the twelve head shapes — 300 of the ~750 findings — through the rule
answers it in one pass. The line falls exactly here:

| | shape | reports |
|---|---|---|
| read | `paths[i]`, `current[app.name]`, `cur[parts[i]]`, `obj[field.field]` | no |
| write | `fields[field] = …`, `self[i] = doc[i]`, `labels[tag.name] = …` | **yes** |

**Every read is silent and every write reports.** That is the correct half of
the line already: prototype pollution needs a write — reading `__proto__`
returns the prototype, it does not replace it.

So FP-010 is not 4,286 shapes and not seven decisions. It is **one**: should a
computed-key write report without evidence that the key is attacker-controlled?
Today it does. Every head shape has a locally derived key — a loop counter,
`Object.keys` of a sibling object, a tag name — so every one is arguably a
false positive, and equally every one is the exact syntax of a
prototype-pollution write.

The seven are pinned as `invalid` cases in
`packages/eslint-plugin-secure-coding/src/rules/detect-object-injection/wild-shapes.test.ts`,
because that is what the rule does. Recording the position is what makes the
question answerable: change the rule and those seven move together, on purpose,
instead of 4,286 signatures drifting one at a time.

The precedent for answering it the other way is `no-timing-unsafe-compare`,
which was inverted to require an attacker-controlled operand and went from 27
findings with zero real oracles to near-zero noise. Whether the same trade is
right here is a judgement about prototype pollution, not about triage, and it
is now the only thing standing between this entry and a verdict.


## FP-011 — the largest false positive in the suite, shipped twice

One rule, two plugins, opposite constructions, the same defect.

`maintainability/no-unhandled-promise` answered yes for every `CallExpression`
and documented it: *"we check all CallExpressions since we can't statically
determine which functions return promises."*
`reliability/no-unhandled-promise` used the inverse — a denylist of ~120 names
known to be synchronous — which has to enumerate the world, and had never heard
of `useDocusaurusContext`, `clsx`, `dynamic` or `require`.

Measured over 200 TypeScript files of excalidraw:

| | before | after |
|---|---:|---:|
| `maintainability/no-unhandled-promise` | 7,061 | **0** |
| `reliability/no-unhandled-promise` | 4,805 | **0** |
| everything else | 8,143 | 8,175 |
| **total** | **20,009** | **8,175** |

Two rules were **59% of every finding the suite produced**, on lines like
`<div className={clsx("col")} />`, `require("./undraw_docusaurus_tree.svg")`
and `const { siteConfig } = useDocusaurusContext();`.

Both now ask the opposite question — does the FILE show this call to produce a
promise? — and report only the shapes a reader can verify from the source in
front of them: `new Promise`, the `Promise` statics, `import()`, `x.then(…)`,
an immediately-invoked async function, and a call to an `async function`
declared in scope. Anything else needs a name the consumer configures in
`promiseReturning` (default `['fetch']`), because a rule that decides from a
name has to let the consumer own the name.

The fix caught a miss in the same block. `.then` was treated as terminating a
chain, so `fetch(url).then(r => r.json())` returned before the handled-check
could look for a `.catch` — the rule passed the exact shape it exists to catch
while reporting a synchronous `require`. Wrong in both directions, from one
`if`.

Fifteen existing tests asserted the old behaviour and are updated rather than
deleted: each now carries a local `async function` or a configured name, so the
branch it was written for is still exercised and the case says something true.
Three shapes are recorded as `FN:` — `new Promise(…)` never reaches the rule,
which listens for `CallExpression` only, and a promise passed as an argument
(`console.log(fetch(url))`) is skipped by the nested-argument rule.


## FP-012 — the rule contradicting its own fix

With `no-unhandled-promise` silenced, `no-magic-numbers` became the largest
source of findings on real code. Classified over 120 TypeScript files of
excalidraw, 735 findings split into two dominant classes:

| class | findings | share |
|---|---:|---:|
| inside an all-numeric array literal | 290 | 39% |
| initialiser of a named `const` | 246 | 33% |
| everything else | 199 | 28% |

Both are the rule arguing with itself. Its entire suggestion is *give the number
a name* — so reporting `export const FOCUS_POINT_SIZE = 10 / 1.5;` reports a
number that already has one. And `[[-92.28, 7.1e-15], [-154.72, 19.19]]` is a
coordinate list: naming each cell produces `const MAGIC_92_28 = -92.28` a
hundred times over.

The rule already carried a `const FOO = 42` exemption. It checked the literal's
DIRECT parent, so `180 as Degrees` (a `TSAsExpression` in between) and
`10 / 1.5` (a `BinaryExpression`) both walked straight past it. Eight measured
carve-outs already existed; these are the ninth and tenth, and they were the two
biggest.

**735 → 428 on the same files**, with the array class at zero. The remainder is
unchanged in character — `clamp(tolerance * height, 5, 80)`,
`Math.max(BASE_BINDING_GAP, 15)`, `snapToMid(…, 0.05, …)` — magic numbers passed
as arguments, which is what the rule is for.

Two things the measurement corrected on the way:

- The first hypothesis was that data arrays were the whole story. Measured at
  4%, because the filter required more than two elements and these are
  coordinate **pairs**. At two or more it is 39%.
- The first version of the named-const walk followed any arithmetic, which
  silenced `const scaled = value * 1.5` — there the const names the *result*
  and 1.5 is still a magic factor. An existing test caught it. The walk now
  requires every operand to be a literal.

A third came from the coverage gate: the recursive array arm in the element
check could never be taken, because the array selected is always the innermost
one containing the literal. Deleted rather than covered.


## FP-013 and FN-001 — one rule, wrong in both directions

The first entry harvested from `CANDIDATES.md`, and it turned out to be two
defects sharing a rule.

### The false positive: a host list that had to name the world

`consistent-function-scoping` exempted callbacks passed to hosts it recognised
— array methods, `.then`, `setTimeout`. `describe`, `it` and the lifecycle
hooks were on no list, so **every block in every spec file reported**: 1,415
findings across two small repositories.

Adding the test frameworks would have been the same mistake one entry larger.
With them added, the survivors were `chrome.storage.onChanged.addListener` —
`addEventListener` was listed, `addListener` was not — and
`defineBackground(cb)`, a framework entry point no list would ever contain.
That is a denylist wearing an allowlist's clothes.

The structural fact needs no vocabulary: **an argument cannot be moved to
module scope without changing what it is an argument to**, and neither can an
object-literal method. It also passes the suite's own litmus test — rename
every identifier to `foo` and the rule behaves the same, which was not true of
any version that read `describe` or `map`.

**1,415 → 145**, and every survivor is a genuine nested helper.

### The false negative: the rule only worked on legacy syntax

Pinning the fix exposed something larger. `collectReferences` walked
`for (const key in node)` — which includes **`parent`**, a link back *up* the
tree. So "which names does this body use" was really "which names appear
anywhere in the file". An arrow whose entire body is `42` collected
`helper, outer`, looked as though it captured its enclosing scope, and never
reported.

Only the `function` declaration form ever fired. Arrows are the dominant modern
form, so the rule was missing most of what it exists to find — while producing
1,415 findings on the things it should have ignored.

A coverage fixture had written the bug down as intent:

> *"Function expressions assigned to variables reference their own binding
> through the parent chain and are treated as capturing."*

Fixing the walk then exposed a third thing: the module-scope guard checked the
literal parent, so `const f = function () {}` at module scope was never
recognised as already-top-level. It had been saved by the same bug.
