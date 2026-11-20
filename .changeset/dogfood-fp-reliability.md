---
'eslint-plugin-reliability': patch
---

fix: stop reporting guards the rule could not read, found by linting the source of Vite, NestJS, ESLint, Fastify, Express and Hono

`no-missing-null-checks` now understands a `while` / `for` test as a guard on its body, a truthy guard over a computed link (`if (m) { m[1] }`), `!x || x.y`, `x == null || x.y`, `Boolean(x) && x.y`, `x !== null && x.y`, a guard in any conjunct of a left-nested `&&`, and a guard branch that ends in a call to a function declared `never` in the same file (or `process.exit()`). A binding filled by a closure declared after its reader no longer counts as never written, a destructured element no longer inherits its container's evidence, and `q.pop()` / `q.shift()` behind a `q.length` loop or `if` test is no longer a nullable read. On ESLint's own `lib/` this takes 62 findings to 16; the 16 left are unguarded `exec` / `match` / `find` results. Lookalikes (a read after the loop, `do … while`, `x || x.y`, a second `pop()` in one iteration, a closure over a binding nothing writes) still report.

`no-silent-errors` now defaults `allowWithComment` to `true`, as ESLint core `no-empty` does: a catch whose block holds a reason in prose (three or more words, not a placeholder), or that carries one after its closing brace on the same line, is documented, not silent. A bare `catch {}`, `// Empty` and `/* handle later */` still report. Set `allowWithComment: false` to restore the old behaviour.
