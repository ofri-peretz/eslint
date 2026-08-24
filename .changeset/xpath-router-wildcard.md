---
'eslint-plugin-secure-coding': patch
---

`no-xpath-injection` no longer reports React Router wildcard paths.

`<Route path={`/${locale}/*`} element={<LocaleRoutes />} />` was reported as
XPath injection at CVSS 9.8 — twice in a city government's application, in files
containing no XPath, in a repository importing no XPath package. `/*` is XPath's
abbreviated `child::*` and also React Router's wildcard segment.

The wildcard step alone is now treated as weak evidence and needs corroboration
from the module: an import from an XPath package, or a DOM XPath API. Every
other marker — `//name`, `[@attr`, a named axis, `text()` — still reports on its
own, because nothing else in a JavaScript codebase is spelled that way.

This is the doctrine the rule already applied to bare calls, where `select` and
`evaluate` were reporting CWE-643 in files containing no XML: the import is the
evidence, the shape never was. The template path simply never applied it.
