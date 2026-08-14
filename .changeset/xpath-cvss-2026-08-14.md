---
'@interlace/eslint-devkit': minor
'eslint-plugin-secure-coding': minor
'eslint-plugin-browser-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-express-security': patch
'eslint-plugin-jwt-security': patch
---

`no-xpath-injection` now needs evidence rather than names, and every rule carries a CVSS.

**`no-xpath-injection`** had a false positive and a false negative in the same rule. It
reported `const QueryValidateSchema = QueryInputSchema` — a Zod schema in a file with no
XPath — because the declaration name contained "query" and the initialiser name contained
"query" and "input". It stayed silent on
`xpath.select("//user[@id='" + id + "']", doc)` because `id` is not in its taint-name list,
even though the string is XPath, the sink is proven, and part of the expression is dynamic.
A declaration must now reach an evaluator, and a proven sink is evidence in its own right.
Concatenations are also flattened and reported once at the outermost node instead of at
every nesting level. Measured across 20 open-source projects: 66 findings down to 42.

**CVSS coverage goes from 80/121 rules to 121/121.** `formatLLMMessage` already enriched
from `CWE_MAPPING`; the table was missing 30 of the CWEs the rules declare. Lookup now also
tolerates zero-padded ids (`CWE-020` matches `CWE-20`), and 24 rules whose documented CVSS
disagreed with the class score now follow the sourced table.
