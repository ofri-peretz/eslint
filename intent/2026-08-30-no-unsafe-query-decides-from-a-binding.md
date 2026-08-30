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
