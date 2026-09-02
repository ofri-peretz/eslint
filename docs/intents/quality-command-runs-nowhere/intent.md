# Intent — `npm run quality` is a promise nobody keeps

> Stage 1 artifact of the AI-native SDLC. Opened after auditing which of the
> quality command's twenty steps actually run in CI.

**Status:** draft · **Opened:** 2026-09-01 · **Owner:** @ofri-peretz

---

## What is wanted

Every check in the `quality` chain either runs somewhere automatic, or is
deliberately recorded as local-only. No check sits in a command that reads like a
gate and is executed only when someone types it.

## Why now

No workflow invokes `npm run quality`. It is a local convenience command, and
most of its steps are covered elsewhere — but five are covered nowhere at all,
neither by a workflow nor by a lock test under `scripts/__tests__/`:

| Command | Runs in CI | Has a lock test |
| :--- | :---: | :---: |
| `check-orphan-lockfiles` | no | no |
| `ilb:flagship:smoke` | no | no |
| `audit:claims:selftest` | no | no |
| `sync:root-readme:check` | no | no |
| `logos:variants:check` | no | no |

`audit:claims:selftest` is the one that matters. Its script header records why
the auditor exists:

> The "100x faster" figure for eslint-plugin-import-next was never measured …
> yet had spread to 15 files before the 2026-08-02 audit. Nothing checked, so
> nothing stopped it. This is the check.

`audit:claims` does run, in `quality.yml`. The self-test that proves it can still
detect a withdrawn claim does not. Our highest-stakes check — the one standing
between us and another unmeasured marketing number — has no evidence it is not
vacuously green.

`ilb:flagship:smoke` not running also corrects a claim made elsewhere: the
CWE-089 corpus does not turn a *PR gate* red. That number lives in a committed
artifact and the weekly benchmark, so
`docs/intents/cwe-089-corpus-driver-evidence/` is less urgent than it was
described as being.

## Affected users and systems

`package.json`'s `quality` script, `quality.yml`, `quality-full.yml`, and the
tiering rule in `docs/DOCS_QUALITY.md` that says where a new check belongs. Also
every future contributor who reads the chain and assumes it gates something.

## Constraints

- Do not simply move all five into the PR path. `ilb:flagship:smoke` needs a
  benchmark run; the tiering rule in `DOCS_QUALITY.md` exists precisely so heavy
  and network-touching checks do not land on every push.
- Do not delete a check to make the list shorter. A check that is genuinely not
  worth running should be removed with its reason recorded, not quietly dropped.
- `npm run quality` must stay usable locally. The goal is that CI no longer
  depends on someone running it.

## Success criteria

- Each of the five is placed in the tier `docs/DOCS_QUALITY.md` prescribes — PR
  gate, scheduled cron with issue-filing, or `quality-full.yml` — or is recorded
  as deliberately local-only with the reason.
- `audit:claims:selftest` runs automatically, and is proven non-vacuous by making
  the auditor fail on a withdrawn claim and watching the self-test catch it.
- `docs/DOCS_QUALITY.md` gains a row for any check that has none.
- A check added to the `quality` chain in future cannot stay CI-invisible: a lock
  asserts every step is reachable from a workflow or explicitly exempt.

## Open questions

- Is `ilb:flagship:smoke` meant to gate anything, or is the weekly benchmark the
  intended home? That answer decides how much the CWE-089 intent matters.
- `logos:variants:check` and `check-orphan-lockfiles` are cheap and repo-only —
  is there a reason they were never added to `test:scripts`, or was it an
  oversight?
- Should the `quality` chain be generated from the workflows rather than
  maintained beside them, so the two cannot disagree?
