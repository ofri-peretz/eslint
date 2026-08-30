---
---

fix(ci): the Version PR stopped refreshing — changesets/action drifted to v2 again

`changesets/action` is pinned to v1.9.0 deliberately: v2 requires Changesets CLI
v3 and this repo is on `@changesets/cli ^2.31.1`. A grouped Actions update moved
the SHA across that major while the comment still read `v1.9.0`.

This is the second time. The first (#579) was silent — the Version PR simply
stopped being created, which is indistinguishable from "nothing to release", and
two customer-facing fixes sat unpublishable behind it. This time v2's renamed
inputs made the step hard-error instead, which is luckier rather than safer:
releases were blocked either way, and `main` carried a red check.

Renaming the inputs would not be the fix — that leaves v2 running against a CLI
it does not support. The pin goes back to v1.9.0.

Both times the only guard was a comment asking the next bump to confront the
constraint, and both times a grouped update sailed past it. Two mechanisms
replace it: dependabot now ignores major bumps for this action, and a lock test
asserts the SHA, the v1 input names, and the dependabot entry. Bumping it back
to v2 fails two of those assertions.
