---
'eslint-plugin-import-next': minor
---

feat(import-next)!: `no-anonymous-default-export` reports what eslint-plugin-import reports at default options

With no options the rule used to report only anonymous functions and classes (#1574 added upstream's options but kept that default). Objects, arrays, literals, template literals and `new` expressions are now reported unless `allowObject`, `allowArray`, `allowLiteral` or `allowNew` allows them, and calls stay allowed, as in eslint-plugin-import 2.32.0 (`src/rules/no-anonymous-default-export.js`). On receptron/mulmoclaude @ 6b4f990 the rule goes from 0 to 9 reports, upstream's count. A config that sets those options is unaffected. To keep the old behavior, set all four to `true`.

## Migration

A default export that is an object, array, literal, template literal or `new` expression now reports. Name it first, or allow the kind in the rule's options to keep the old behavior.

```js
// Before: passed with no options. After: reported.
export default { retries: 3 };

// Fix: assign it to a name.
const config = { retries: 3 };
export default config;
```

```js
// Or keep the old behavior in eslint.config.js.
'import-next/no-anonymous-default-export': ['error', {
  allowArray: true,
  allowLiteral: true,
  allowObject: true,
  allowNew: true,
}],
```
