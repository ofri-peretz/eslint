---
'eslint-plugin-secure-coding': patch
---

`no-xpath-injection` no longer treats every path join as XPath construction.

The heuristic for "does this string concatenation look like XPath" was
`includes('/') || includes('[')`, which matches every path join, URL build and
array index in existence. Measured on the Interlace monorepo, it reported
CWE-643 on:

```js
return fullPath.replace(baseDir + '/', '');
```

XPath has syntax of its own, so the gate now requires some of it: the descendant
axis (`//`), an attribute predicate (`[@id=`), an explicit axis (`child::`), the
node tests and functions (`text()`, `node()`, `contains(`, `starts-with(`,
`local-name(`, `position()`), or a location step carrying a predicate (`/user[`)
— the form that has no `//`.

Verified in both directions: path joins, URL builds and array-index strings go
silent, while `"//user[name='" + input + "']"`, `"/root[@id='" + input + "']"`
and `"/root/user[" + input + "]"` all still report.

Known limitation, unchanged and now documented in the source: the
variable-declaration path still matches on the name `path`, so
`let path = template;` reports. Dropping that keyword was tried and reverted —
it also stopped `let searchPath = userInput;` firing, and by name alone the two
are indistinguishable. Separating them needs the declaration's use to reach an
XPath sink, which is the data-flow analysis these rules avoid.
