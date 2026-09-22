---
'eslint-plugin-secure-coding': patch
'eslint-plugin-import-next': patch
'eslint-plugin-maintainability': patch
---

fix: three false positives found by sweeping the plugins over a real corpus

Each was minimized to a standalone snippet, reproduced mechanically, and then
argued against by an independent reviewer that saw only the snippet and the
rule's own docs. Two further candidates were rejected at that gate — one whose
minimization would not reproduce, and one where the reviewer measured the
proposed fix at 0 true positives out of 1 report and sent it back as a
documentation defect instead. Neither is in this release.

**`detect-object-injection` (secure-coding)** — the fix this rule's own docs
prescribe drew CVSS 9.8 when it was bound to a name rather than used as an
expression:

```ts
const assigned = Object.assign(Object.create(null), src);
assigned[key] = 1; // REPORTED
```

`Object.assign` returns its first argument and never invokes `SetPrototypeOf`,
so the binding holds the null-prototype target; a `__proto__` key in the source
lands as an inert own data property. The rule already certified that expression
as prototype-less when it was the assign _target_, then reported it one
statement later as the indexed object. Plain `{}` targets, parameter targets and
the two-step primitive `a[k1][k2] = 1` all still report.

**`exports-last` (import-next)** — a file whose every statement is an export
reported its own last-but-one line, telling `export default function a() {}` to
"move this export to the end of the file" with nothing non-export after it.
Declaration-exports were being reclassified as non-exports to exempt them from
being reported, which also made each one a positional wall for the exports
before it. Upstream `eslint-plugin-import`, which this rule links as its
documentation, treats a declaration-export as an export unconditionally.

**`cognitive-complexity` (maintainability)** — a factory whose own body is a
single `return` was scored at its returned closure's complexity and reported
alongside it, so one piece of code drew two HIGH findings and the one on the
factory advised "Extract logic to helpers" about a body that was already
nothing but a helper. The traversal descended into nested functions, charging
their points to every enclosing function; since each nested function is already
visited and reported independently, the descent only inflated ancestors. This
matches SonarQube RSPEC-3776, which reports a function's own complexity and
keeps the aggregate in a metrics sink.
