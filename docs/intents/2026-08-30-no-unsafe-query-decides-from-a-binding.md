---
slug: no-unsafe-query-decides-from-a-binding
opened: 2026-08-30
packages:
  - eslint-plugin-mongodb-security
cases:
  - ILB-0121
  - ILB-0123
---

## What

Replace the taint model in `mongodb-security/no-unsafe-query`. Today it treats
**any identifier inside a filter object** as user input, and nothing else as
user input at all.

## Why

Found while writing registry cases for the flagship rules, and executed rather
than reasoned about:

```
0  find(req.body)                      ← the whole request object: MISSED
1  find({ name: req.body.name })       ← a request property: reported
0  findOne(req.query)                  ← MISSED
1  find({ name: NAME })  const NAME='root'   ← a module constant: REPORTED
0  find({ name: 'root' })              ← inline literal: silent
```

One heuristic produces both failures. `find(req.body)` is the most direct form
of NoSQL injection there is — the caller hands you the query document, and
`{"$ne": null}` as a password turns the lookup into "any user". The rule does
not see it. Meanwhile a `const NAME = 'root'` two lines up is reported with the
message `User input "NAME" is used directly`, which is simply false.

This is a **flagship** rule. It is in `.agent/flagship-rules.md`, which means
the benchmarks lead with it and a stranger evaluating `eslint-plugin-mongodb-
security` meets it first. A rule whose model is "any binding is untrusted, any
literal is safe" is a dictionary with one entry, and it is wrong in both
directions at once.

Recorded as ILB-0121 (open miss) and ILB-0123 (open false positive), both with
no coverage claim, because we do not get to assert a rule handles something it
does not.

## Constraints

- `readsRequestShape` already exists in the devkit and answers the structural
  question — is this a read of `.query` / `.params` / `.headers` / `.body` off
  something that ARRIVED as a parameter. Use it rather than inventing a third
  taint model.
- **Precision before recall.** Closing the `find(req.body)` miss must not widen
  the rule into reporting every object passed to `find`. If only one direction
  can be fixed safely, fix the false positive first: it is spent on every build
  a consumer runs.
- Both cases must flip from uncovered to verified — ILB-0121 to `report`,
  ILB-0123 to `silent` — and each must fail against the unfixed rule.
- The 100% coverage gate applies; delete dead branches rather than covering
  them.
- Open misses in the ledger go **4 → 2**, back to where they were before this
  rule was examined.

## Done when

- `find(req.body)` and `findOne(req.query)` report.
- `find({ name: NAME })` with a module-scope constant is silent.
- ILB-0121 and ILB-0123 carry coverage claims and `check:case-registry` shows
  them verified.
- The corpus precision for `mongodb-security/no-unsafe-query` does not fall.

## Outcome — 2026-08-30

Met. ILB-0121 and ILB-0123 both carry coverage claims and verify; open misses
went **4 → 2**, back to where they were before the rule was examined. All seven
probe shapes correct, including `find(node.body)` on a module-local object
staying silent — the parameter requirement doing the work the name list used to
pretend to do.

The fix needed one devkit change. `readsRequestShape` requires depth ≥ 2 for
`body`, because `body` is both a request property and the commonest property
name in this ecosystem — `node.body`, `message.body`. That default is right in
general and wrong here: `find(req.body)` is the bug itself, and the argument
POSITION supplies the meaning the depth rule waits for. Added
`{ bodyNeedsDepth?: boolean }`, opt-in, defaulting to the existing behaviour,
with three devkit tests including one proving the opt-out relaxes the depth
rule and **nothing else** — a module-local `.body` is still not a request.

**Twenty-six tests failed on the first run, and every one was the old model
written into a fixture.** Three categories:

- Fixtures using a free-floating `req` that was never a parameter. Real Express
  code has no such thing; it only worked because the rule matched the printed
  string `req.body`. Fixed by extending the existing wrapper helpers so `req`,
  `request` and `ctx` are handler parameters — wrapping rather than editing
  each fixture, which is the guarantee those helpers already claimed.
- `valid: User.find(req.body)`, annotated "query argument is not an object
  literal". That comment described the implementation, not the intent, and the
  fixture pinned the miss. Moved to `invalid`.
- `invalid: User.findOne({ username: username })`, annotated "reported with an
  $eq-wrapping suggestion". It pinned the false positive. Moved to `valid`.

A fixture that documents a defect as though it were a decision is worse than no
fixture: it makes the defect look deliberate, and it fails the moment anyone
fixes the thing.

The `Literal` branch of `getNodeSource` is deleted rather than covered. It
existed so `'req.body'.x` — a STRING whose contents read like a request path —
stringified to the tainted pattern and reported. That was the string-matching
model's purest false positive, and with the decision structural the branch is
unreachable. Coverage back to 100% across statements, branches, functions and
lines; a zero-argument fixture was added because the identically-spelled one
belonged to a different rule and this guard had never been exercised.

### A second devkit change the fixtures forced

Rewriting the fixtures so `req` arrives as a parameter — which is the only
honest way to test a rule that decides from the binding — left five failing,
and they were not a fixture problem. Four were handler shapes the wrapper did
not supply. The fifth was Koa:

```
ctx.request.body.email     ← read nothing
ctx.request.query.term     ← read nothing
ctx.req.headers.auth       ← read nothing
```

`readsRequestShape` takes the property nearest the root, and for Koa that is
`request` — a member of neither shape set — so every Koa handler in the corpus
came back false. That is a miss with nothing to do with naming, in the same
class as the one this intent was opened to fix: the predicate was reading the
shape it expected rather than the shape the framework has.

Fixed by stepping over a single `request` / `req` link before asking the shape
question, with two devkit tests: one that the three Koa forms now read, and one
that the hop invents nothing — `ctx.request.somethingElse` is still not a
request, a module-local `ctx` object is still not a parameter, and a bare
`x.request` is still not a read of anything caller-supplied. Devkit suite 297 →
303, all green.

That change was enough on its own: with it, the four handler-shape failures
resolved too, and widening the wrapper's parameter list proved unnecessary.

### Sabotage

The lock was proven by breaking the fix in each direction and confirming the
suite goes red:

```
baseline                                          142 passed
bare identifier counts as user input again          3 failed   (ILB-0123 FP)
whole-argument reads ignored again                  1 failed   (ILB-0121 miss)
restored                                          142 passed
```

Package suite 680 passing, coverage 100% on statements, branches, functions and
lines. `case-registry --check`: 137 cases, 135 verified, **0 regressed**, 2
uncovered — and those two are ILB-0040 and ILB-0042, which belong to a
different intent.
