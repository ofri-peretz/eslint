# Case philosophy — how a rule's claims are written down

Every rule in this repository makes claims about code: this is a defect, that
is not. `benchmarks/RULE_CASES.md` is the register of those claims, and it is
generated out of the RuleTester cases themselves — there is no second copy to
keep in sync. Delete a case and it leaves the register.

This file is the contract those cases have to meet. `BENCHMARK-CRITERIA.md`
governs what we *measure*; `FALSE-POSITIVE-CATALOGUE.md` catalogues FP
*classes*. This one governs the individual case: what it must assert, how it
must be named, and what has to be true before it counts as protection.

---

## 1. The five kinds, and what each one asserts

| kind | array | asserts |
| :--- | :--- | :--- |
| **TP** | `invalid` | a defect we intend to catch |
| **TN** | `valid` | code we intend to leave alone |
| **FP** | `valid` | a report we made **in the wild** and have since sealed |
| **FN** | `invalid` | a defect we **missed in the wild** and have since sealed |
| **GAP** | `valid` | a defect we still miss — documented, and deliberately not counted |

TP and TN follow from the array, so they need no marker. FP, FN and GAP are
claims about *history* that the array cannot carry, so they are marked with a
prefix on the case `name`: `FP: …`, `FN: …`, `GAP: …`.

**FP and FN are the same asset seen from two sides.** Both are a mistake we
made against real third-party code, now held shut by a case that fails on the
rule as it was. Both are protection. Their sum is the only number in the
register earned outside our own imagination — every TP and TN is a position we
asserted and then satisfied, which proves consistency, not correctness.

### The marker must agree with its array

`FN:` in `valid` claims a sealed miss that still passes silently. `GAP:` in
`invalid` claims an open miss the rule already catches. Neither is a subtler
position; both are typos. The extractor **refuses** them rather than
reinterpreting, and `benchmarks/__tests__/sealed-vs-open-lock.test.ts` proves
it still refuses.

This rule exists because the register lost the distinction once. A seal is
applied by *editing a case that already exists* — an `FN:` case moves from
`valid` to `invalid` when the fix lands — and on the first two occasions that
happened, the marker was deleted in the move. The record of the mistake
vanished at the exact moment it became worth keeping, and the register read
`FN 0` while eleven found-and-fixed misses sat in the suite unlabelled.

---

## 2. A case is not documented until its name says what it proves

**The name states the claim. The code is the evidence, not the claim.**

A name that restates its own code documents nothing — the code is already
there, and a reader who needed the restatement could read it. What a reader
cannot recover from the code is *why this case is in the file*: which
distinction it defends, which neighbouring case it is different from.

```ts
// ✗ restates the code
{ name: 'crypto.createHash("md5")', code: 'crypto.createHash("md5");' }

// ✓ states the claim
{ name: 'a weak digest chosen explicitly, with the driver imported', code: '…' }

// ✗ says nothing
{ code: 'const x = obj[key];' }

// ✓ names the distinction it is defending
{ name: 'a read cannot pollute — [[Get]] returns the prototype, it does not replace it', code: '…' }
```

An unnamed case still runs and still counts as a test. It does **not** count as
documentation, and the gate reports it.

### Say what is true, not what the rule does

`'does not report'` is a restatement of the array. `'a config value compared
with === is not a credential'` is a claim someone can disagree with — which is
what makes it worth writing down.

---

## 3. FP and FN carry provenance, in two separate fields

| tag | answers | example |
| :--- | :--- | :--- |
| `@source` | *where in the world does this code exist* | `@source excalidraw/excalidraw packages/element/binding.ts:119` |
| `@found` | *how did we learn we were wrong* | `@found real-source scan` |

**They must not be folded together.** `@source` counts toward "rules with a
case drawn from real code" — the one metric that is not about our own
imagination. A specification citation is real provenance, but it is not a line
somebody shipped, and putting it in `@source` would inflate that number.

`@found` is a **category**, not a sentence. The current taxonomy:

`real-source scan` · `spelling probe` · `spec diff` · `grammar review` ·
`rule review` · `ecosystem fact` · `head-to-head with <peer>`

A count, a rationale or a date inside `@found` fragments the taxonomy into one
bucket per number. Put those in the comment beside it.

---

## 4. A seal is not a seal until it fails on the unfixed rule

This is the whole difference between a receipt and a test.

Before an `FP:` or `FN:` marker goes on a case, run the case against the rule
**as it was before the fix** and confirm the opposite verdict:

```bash
git show HEAD:packages/<pkg>/src/rules/<rule>/index.ts > /tmp/old-rule.ts
# lint the sealed case with the old rule; an FN must be SILENT, an FP must REPORT
```

If the old rule already behaved correctly, the case is a TP or TN with a good
comment — not a seal, and it must not be counted as one. Two of this branch's
near-misses were exactly that: `<nav role="navigation">` and `this[k] = v` both
looked like defects and were deliberate, correct behaviour.

**A rule that declines on purpose and a rule that cannot see are different
facts, and the register has to tell them apart.**

---

## 5. Three classified cases a side, counted on code

A rule needs **three** things it must catch and **three** it must leave alone.

One case proves the rule matches one string. Two is a pair, and can still be
two spellings of one thought. Three forces a shape: the canonical form, a
variation, and a near-miss that must stay quiet — and it is the smallest number
at which deleting any single case leaves the position still legible.

Counted on `code`, not on descriptions: a case the rule was actually shown is
checkable against the rule; a description is not.

**`GAP` satisfies neither side.** A rule cannot discharge its obligation to
catch three things by documenting that it does not work.

---

## 6. When a fix widens a rule, seal the class — not every instance

A change that corrects a whole class of blindness produces hundreds of
newly-caught cases. Seal **one case per rule**, naming the class, and record
the measured count in the comment beside it.

1,113 near-identical `FN:` rows would bury the eight considered gaps we
actually have, and the register's value is that a reader can see every real
position at once. Bulk findings live in their own generated report
(`benchmarks/SPELLING_MISSES.md`) until they are fixed; each fix then arrives as
one seal with its receipt.

**Corollary:** a bulk finding is *not* a `GAP`. A `GAP` is a considered
position — we looked, and this is a limit we accept. A mechanical blind spot
nobody has considered is a to-do, and filing it as an admission dilutes the
admissions that were actually made.

---

## 7. What the gate enforces

`npx tsx scripts/rule-case-ledger.ts --check`

| check | ratchet |
| :--- | :--- |
| every rule has a described TP **and** a described TN/FP | shrink-only baseline |
| every rule holds ≥3 classified cases a side | shrink-only baseline |
| undescribed cases | **shrink-only** — a new case must be named |
| a marker that contradicts its array | hard failure |
| byte-identical duplicate cases | counted, ids disambiguated |

Plus `benchmarks/__tests__/sealed-vs-open-lock.test.ts`, which requires every
FP and FN to carry a description and a `@found`, refuses a `GAP` propping up a
thin invalid side, and — the material one — writes a file that makes the
contradictory-marker mistake, runs the extractor, and requires it to refuse.
Re-reading the generated JSON would pass identically against an extractor that
had stopped checking.

---

## 8. Where the debt is

81% of cases carry no name. That is the register's largest gap and it is not
closable by generating text: a name that restates its code is worse than
silence, because it looks like documentation.

The order of work is:

1. **Stop the bleeding.** New cases must be named — this is the ratchet, and it
   is the only part that is automatic.
2. **FP, FN and GAP first.** They are 100% described today and must stay so.
3. **Rules with no described case at all.** A rule nobody can read the position
   of is worse than a rule with a thin one.
4. **Everything else**, worst rules first, as their code is touched for other
   reasons. A case is cheapest to name while you are already reading it.

---

## 9. The case registry — what we are accountable for

Sections 1–8 govern a rule's own cases. They cannot answer *"is prototype
pollution through a request-supplied key covered, and how do we know"*, because
**a rule cannot be missing a case it never claimed.** Rule-first documentation
can only ever report what the tests happen to say.

`benchmarks/cases/registry.json` inverts the unit. The entry is a **case** —
a thing that happens in real code, identified like a vulnerability record:

| field | holds |
| :--- | :--- |
| `id` | `ILB-nnnn`, permanent, never reused |
| `title` / `rationale` | what it is, and why it is or is not a defect |
| `cwe` | the classification, or `null` when it is a must-stay-silent case |
| `severity` | `cvss`, `vector`, and **`source`** — a score with no source renders with a `*` |
| `coverage` | `{ rule, expect: report or silent, evidence }` — a CLAIM |
| `occurrences` | where it has actually been seen; empty says "constructed, not observed" |
| `code` | the case itself |
| `coverage` | `{ rule, expect: report\|silent, evidence }` — a CLAIM |

### Coverage is a claim; the script turns it into evidence

`npx tsx scripts/case-registry.mts` runs each case's own code through each rule
that claims it and checks the verdict. Every status in `CASE_REGISTRY.md` is
computed on that run. A stored `covered: yes` is a spreadsheet, and it starts
decaying the moment a rule changes.

### Improving without regressing

Two properties make this safe for many hands:

- **Append-only.** Ids are permanent. A case that no longer applies is
  `retired` with a reason and keeps its number, so anything citing it still
  resolves.
- **The verified SET is ratcheted, not its size.** A run that verifies a new
  case while dropping an old one keeps the same total. The gate compares ids,
  so it fails *by name*: `1 case(s) were verified before and are not now:
  ILB-0004`. Improving one area cannot quietly undo another.

### A registry entry must be able to fail

This was nearly got wrong on the first seed. ILB-0004 was written as
`const arr = []; arr[arr.length] = x`, and a locally-constructed array was
already cleared by an older path — so the entry passed whether or not the fix
it documented existed. It was rewritten to take `arr` as a **parameter**, which
is the form that actually exercises the fix.

**Before trusting a new entry, break the code it covers and watch the gate name
it.** An entry that cannot fail is not evidence, and it is worse than no entry
because it reports as protection.

### An uncovered case is a feature of the register

ILB-0010 — a key reached through a call the file cannot summarise — has no
coverage and says so. That row is the point: in a rule-first view it is invisible,
because no rule claimed it and no test is missing.
