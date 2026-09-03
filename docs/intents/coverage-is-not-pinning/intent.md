# Intent — 100% coverage held while the tests asserted the bugs

> Stage 1 artifact of the AI-native SDLC. Opened after a sweep found 47 tests
> that pinned a rule's blind spot as intended behaviour, in packages that were
> at 100% line and branch coverage the whole time.

**Status:** shipped · **Opened:** 2026-09-02 · **Owner:** @ofri-peretz

---

## What is wanted

A test case states a **position**: this input is a finding, that one is not, and
here is why. A gate can tell such a case from one that exists only to execute a
branch, and the second kind cannot be the sole evidence for a rule's behaviour.

## Why now

Every plugin in this repository is gated at 100% statements, branches, functions
and lines. That gate was green throughout the computed-key sweep, during which
**47 tests were found asserting a defect as correct behaviour** — including
these, verbatim:

| Test name                                                                     | What it asserted                       |
| :---------------------------------------------------------------------------- | :------------------------------------- |
| `coverage - computed callee property (id 9 FALSE)`                            | `yaml['load'](req.body.data)` is safe  |
| `computed class members and literal property access (L67/L81/L95 false arms)` | `["defaulProps"] = 1` is not a typo    |
| _"Computed member on the error (documented false negative)"_                  | `res.send(err['stack'])` leaks nothing |
| _"Computed sensitive access → property is a Literal (documented FN)"_         | `err['stack']` is not an exposure      |

Coverage proves a branch **ran**. It says nothing about what the case **claims**
while running it. The two are independent, and this repository has been treating
the first as evidence for the second.

The failure is not hypothetical or historical. Six of those flips happened in a
single session, in rules shipped to npm, and one of them — `no-improper-sanitization`
— had a matching claim in its **published documentation** telling users the
detected case was a false negative.

## The mechanical tell

A case named after the machinery it exercises rather than the position it takes:

```
name: 'non-state update/unary expressions (L231/L232/L241 false arms)'
name: 'regex + array holes are not JSX (L139/L145 false arms)'
name: 'class expression statics have no component name (L72/L88 …)'
```

47 such names exist today. A line number in a test name is a statement that the
case was written to satisfy a coverage gate, and every one of them is a place
where nobody asked whether the behaviour being executed is the behaviour we want.

This is detectable without judgement: a `name:` containing `L<n>`, `id <n>`, a
`TRUE`/`FALSE` branch marker, or the word `coverage` is a case that was named
after the instrument.

## Constraints

- **The coverage floor does not move.** 100% has repeatedly caught real gaps —
  ten abstain paths opened by widening rules to read `o['k']` were each found
  within seconds by coverage and nothing else.
- **No case-per-branch requirement.** The house rule stands: a branch that
  cannot be reached is deleted, not covered.
- **Shrink-only, not a one-pass rewrite.** 47 renames across twenty-odd files,
  each needing a judgement about what the case actually claims, is a change
  nobody can review.
- **A rename must not be allowed to preserve a wrong position.** Three of the
  six cases flipped this quarter were asserting the opposite of what the rule
  should do; a tidier name would have hidden that.

## Success criteria

- **Now:** 47 branch-named cases · 0 gates distinguishing a claim from an execution.
- **Wanted:** 0 new branch-named cases; the existing 47 renamed to the position
  they take, or converted to `invalid` where the position was wrong.
- **Breach:** any new case named after a line, branch id, or coverage arm.
- **Proven by:** adding a case named `(L42 false arm)` makes `check:rule-cases`
  exit 1 and name it; renaming one of the 47 without updating the baseline also
  exits 1.

## What this is not

Not a proposal to lower the coverage floor. 100% has repeatedly caught real
gaps — an abstain path opened by widening a rule is found by it within seconds,
and ten such paths were sealed that way in one session.

The claim is narrower and it is this: **coverage is necessary and not
sufficient**, and treating it as sufficient is how 47 assertions that the
product is wrong survived every gate the repository has.

## Open questions for Design

1. Is a rename enough, or must a branch-named case also cite the claim it makes?
2. Where does the check live — `check:rule-cases` already reads every case's
   `name`, so it may be a few lines there rather than a new instrument.
3. What is the shrink-only baseline: 47 today, or should the existing set be
   fixed in one pass so the gate starts at zero?
