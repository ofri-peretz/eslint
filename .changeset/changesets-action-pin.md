---
---

fix(ci): the Version PR stopped refreshing — action major and input names drifted apart

`changesets/action` moved to v2.1.1 in a grouped update without its inputs. v2
renamed all three (`version` → `version-script`, `commit` → `commit-message`,
`title` → `pr-title`) and hard-errors on the old names, so the Version PR stopped
refreshing and `main` carried a red check.

v2 is the _correct_ major: `package-lock.json` resolves `@changesets/cli` to
3.0.1. The bump was right; only the inputs were missing.

The comment above the pin said the opposite — that the repo was on CLI ^2.31.1
and the action must stay on v1.9.0. That was true when written and stopped being
true when the CLI moved to v3. Left stale, it read as an instruction, and the
first attempt at this fix followed it and pinned _back_ to v1.9.0 — which would
have paired a v1 action with a v3 CLI and kept releases broken while looking
deliberate.

So the guard is no longer prose. A lock test asserts the _pairing_: the action
major, the input names that major accepts, and the CLI major in the lockfile. It
fails on both drift directions — a v1 SHA against CLI v3, and the v2 SHA with v1
input names that caused this outage. Dependabot also stops carrying this action
across a major inside a group.

Upgrading is now a deliberate three-line change, and the test says so if any one
of them is forgotten.
