---
'eslint-plugin-secure-coding': patch
'oxlint-plugin-secure-coding': patch
---

fix(secure-coding): `no-hardcoded-credentials` no longer aborts the whole run on a TypeScript `import x = require('m')`

Resolving which module a called binding comes from read `.source.value` off every import, but `import x = require('m')` has no `source`, so a `const` object literal passed to such a binding threw `TypeError: Cannot read properties of undefined (reading 'value')` and ended the ESLint process (found scanning cal.com). The import-equals declaration is now resolved through its `moduleReference`, so `import session = require('express-session')` is also recognised as the session middleware; an entity-name alias (`import s = A.B`) and any other module stay silent.
