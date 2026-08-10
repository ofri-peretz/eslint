---
'eslint-plugin-express-security': major
---

Every rule now abstains in files without local Express evidence

The plugin had no notion of whether a file had Express in it. Measured over
**107,382 files across 108 repositories**: 5,921 findings, of which **4,450
(75%) were in files with no Express import** — `no-missing-csrf-protection`
alone contributed 3,556.

Every rule now requires local evidence: an import / `require` / dynamic
`import()` of `express`, **or** a `(req, res, next)` middleware signature.

The signature arm is deliberately the **three-argument** form only. Two-argument
`(req, res)` is shared with `node:http`, Next.js API routes and other servers,
so accepting it would re-import the false positives this change removes. The
three-argument form with a trailing `next` is the Connect/Express middleware
contract and essentially nothing else. Error-handling middleware
`(err, req, res, next)` matches on the tail.

The import arm alone was not enough: over the 12-repo Express corpus, 68 of 114
files containing a `(req, res)`-shaped function (60%) import no `express` —
route modules routinely receive `app` or `router` from their caller.

After the change the same corpus yields 1,480 findings instead of 5,921, and
**no recall is lost**: diffed across all 1,003 files that import `express`,
findings are identical before and after (1,554 → 1,554, zero lost). The 44
remaining findings outside an `express` import are, by construction, files the
gate opened on the middleware signature.

This is a **major** bump: any rule may now stay silent where it previously
reported.
