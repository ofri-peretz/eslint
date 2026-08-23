---
'eslint-plugin-import-next': patch
---

`no-extraneous-dependencies`: `.`, `..` and `#subpath` are not packages.

Three things were being reported as undeclared dependencies that cannot be
dependencies at all:

```js
require('..')            // the package root — how a package's own tests import it
import a from '.'        // likewise
import a from '#dep'     // a Node subpath import
```

The relative guard tested only the `./` and `../` **prefixes**, so the bare
forms fell through and were reported as packages literally named `.` and `..`.
`require('..')` was four of the ten findings on
auth0/express-openid-connect — the first repository this rule was ever measured
against, because it had been excluded from the corpus gate on the false premise
that it needed an installed dependency tree.

A `#`-prefixed specifier resolves through the package's own `imports` field in
package.json. It is internal by specification and can never name an external
dependency.

The guard requires a `/` or end-of-string after the dots, so a package name
that legitimately begins with dots still reports — pinned as an invalid fixture.

Corpus: 3,147 → 3,111. A correctness fix rather than a volume one; the large
targets have genuinely undeclared imports, and those findings remain
unadjudicated.
