---
'eslint-plugin-browser-security': patch
---

refactor: `no-incomplete-url-sanitization` checks the resolved name explicitly

`PASSTHROUGH_METHODS.has(propertyName(callee) as string)` leaned on
`Set.has(null)` being false, which spells "the name could not be resolved" and
"the name is not in the set" identically. The check is now explicit, and the
node-type comparisons beside it use `AST_NODE_TYPES` rather than raw strings.
No behaviour change.
