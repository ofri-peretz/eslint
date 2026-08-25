---
'@interlace/eslint-devkit': patch
---

fix: `getFileImports` sees ES2022 arbitrary module namespace names

`import { "arbitrary-name" as x } from './y'` produced **no match at all** —
not a wrong path, nothing — so the edge never entered the dependency graph.
Every rule built on this helper inherited the blind spot, and a rule cannot
report on an edge it cannot see. `no-cycle`, which is `error` in `recommended`,
would silently miss a cycle running through one.

The cause was the specifier character class `[\w*{}\s,]`, which contains no
quotes and so could not span `{ "arbitrary-name" as x }`. The pattern now
alternates that class with whole quoted segments rather than simply adding `'`
and `"` to it — a bare quote in the class would let the clause run through the
module path's own quotes and capture the wrong string. The quoted alternatives
exclude newlines, so an unbalanced quote cannot swallow following lines and
drop several imports at once.

No measurable change on the pinned corpus: `no-cycle` reports 32 findings with
the old pattern and 32 with the new one, because those eight repositories do
not use the syntax. This closes a blind spot rather than moving a number.
