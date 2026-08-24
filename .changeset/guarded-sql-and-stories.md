---
'@interlace/eslint-devkit': patch
'eslint-plugin-secure-coding': patch
---

Three false positives found by reviewing findings on real repositories.

`no-sql-injection` no longer reports an identifier narrowed by an allowlist.
No driver binds a table or column name, so an allowlist plus a guard clause is
the correct fix for that case and is what the standard advice prescribes.
bcgov/sso-requests wrote exactly that — `if (!ALLOWED_TABLES.has(table)) throw`
above the query, with a comment explaining why — and the rule reported the
defence as the vulnerability. The check is deliberately narrow: the guard must
`throw` or `return`, and the allowlist must be a fixed list of literals, so a
membership test that falls through or an allowlist passed in by the caller still
reports.

`no-fail-open-auth` now skips test files. It had no test handling at all, and
reported a mock component inside `__tests__` written to exercise exactly this
rule's subject.

Storybook stories are recognised as development material, so a
`password: "TestPassword123!"` on a story for a user called John Doe is no
longer a hardcoded credential. A story never enters the application bundle.

Verified against the repositories that produced them: bcgov/sso-requests drops
from 4 SQL findings to 1, cds-snc/canadalogin-user-selfservice-webapp from 11 to
6, and a genuine unparameterised request header in a query still reports.
