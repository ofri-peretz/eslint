---
'eslint-plugin-secure-coding': patch
'eslint-plugin-reliability': patch
'eslint-plugin-import-next': patch
---

Fix three false positives from the issue backlog.

- `no-hardcoded-credentials`: an ambiguous "common password" keyword match
  (e.g. the string `'password'`) now needs the enclosing slot's own category
  to actually say "password" (or an unclassified-but-credential-ish name),
  not merely to end in some unrelated credential word — a route-name list
  like `SENSITIVE_ROUTE_TOKENS` no longer reports the word `'password'` as a
  credential (#1557).
- `no-missing-null-checks`: a `const` already narrowed truthy by a ternary
  stays narrowed inside a nested callback declared in the narrowed arm — the
  binding can never be reassigned before the callback runs. A `let` or a
  parameter gives no such guarantee and still reports (#1564).
- `no-extraneous-dependencies`: a tsconfig `@/` path alias
  (`"paths": { "@/*": ["./src/*"] }`, the create-next-app / shadcn
  convention) is never a scoped package — npm scopes need at least one
  character after `@` — so it is no longer reported as missing when an
  unmodelled resolver is configured (#1551).
