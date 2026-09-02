---
slug: a-test-must-fail-without-its-fix
opened: 2026-09-02
packages: []
cases: []
---

## What

Make it mechanical to show that a test would have caught the bug it was written
for — and make a test that would not, visible.

## Why

`CLAUDE.md` states the rule plainly: _"A fix is not done until a test would have
caught the bug pre-deploy. The test must fail on the unfixed code and pass on the
fix."_ Nothing checks it, and the shortfall is not occasional.

Writing **one** test file for `no-hardcoded-credentials` on 2026-09-02 produced
three drafts, each passing, each proving nothing:

1. Four `valid` cases used object keys whose names never opened the credential
   gate. All four passed with the fix **removed**.
2. Renaming them fixed two. The other two used values too short to be
   secret-shaped, so the guard was never what silenced them.
3. A third used `ssh_tunnel_handshake_rejected`, which fails **with** the fix —
   `handshake` carries the consonant run `ndsh` and trips a pre-existing rule.

Only the fourth draft was load-bearing, and the difference was invisible from
reading. Each round was found by deleting the fix and re-running — an operation
that takes seconds and that nothing asks for.

The same class, in the same week: `name-vocabulary-spread.test.ts` carried a
guard specifically to stop its assertion passing vacuously, and the guard itself
expired the moment the offender count it was keyed to reached zero.

A green suite that cannot fail is the most expensive artifact in the repo,
because every later decision rests on it.

## Constraints

- **Mechanical, not procedural.** "Remember to check" is what failed. The
  mutation has to be something a script performs.
- Scope it to changed rules on a PR. Mutating every rule in the suite on every
  push is a cost nobody will pay, and an unaffordable check is an unrun one.
- A case that cannot be made to fail is not automatically wrong — a `valid` case
  can legitimately guard a shape the rule never touched. It must SAY so, the way
  the registry's `direction` field already does, rather than being silently
  counted as coverage.
- This measures whether a test discriminates, not whether it is well written. It
  must not become a style gate.

## Done when

- A script inverts the rule under change — disabling its report path — and
  reports which of its cases still pass. Every `invalid` case that survives is
  listed.
- The number of non-discriminating cases is a shrink-only ratchet, baselined
  honestly at whatever it turns out to be. The first honest reading is the point;
  it will not be zero.
- The three drafts above are in the repo as a worked example, because the useful
  part is not that they were wrong — it is that each was wrong differently and
  all three looked right.
