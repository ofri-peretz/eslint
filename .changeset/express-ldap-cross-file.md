---
'eslint-plugin-express-security': patch
'eslint-plugin-secure-coding': patch
---

Stop reporting on evidence that lives in another file, or on no LDAP evidence at all

**express-security — `require-helmet`, `require-rate-limiting`.** Both required
`express()` and the middleware registration to be in the *same file*. Splitting
setup into `setAppConfigurations(app)` is the normal shape for any non-toy
Express app, so both reported ToniR7/express-typescript-starter, which registers
`helmet()` and its rate limiter in `utils/appInitialization.ts` and has both
packages in `dependencies`.

They now abstain once the app binding is passed to another function: the
middleware stack is assembled somewhere the rule cannot see, and "no helmet
here" says nothing about the application.

**secure-coding — `no-ldap-injection`.** One branch reported any variable whose
initializer *printed* containing `req.`, with no LDAP evidence required. It
flagged `var header = req.headers[field.toLowerCase()]` in **expressjs/morgan**
— an HTTP logger with no LDAP anywhere — as CWE-90 at CVSS 9.8. The "looks like
a filter" guard was satisfied by the parentheses of `toLowerCase()`.

That branch now requires the file to touch LDAP: an `ldapjs`/`ldapts`/
`activedirectory`/`passport-ldapauth` import (ESM *or* `require()`, since LDAP
code in the wild is largely CommonJS), or a call to one of the LDAP sink methods
the rule already recognises. The rule's other branches each carry their own
evidence — an LDAP method call, or a literal that parses as a dangerous filter —
and are unchanged.
