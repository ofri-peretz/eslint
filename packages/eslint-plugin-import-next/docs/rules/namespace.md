# namespace

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Ensure imported namespaces contain dereferenced properties as they are dereferenced

## Rule Details

Reading a name off a namespace import that the module does not export is reported: after `import * as ns from './m'`, each of `ns.missing`, `ns['missing']` and `const { missing } = ns`.

The rule decides by binding: `ns` must be the namespace import itself. A default import that happens to be called `ns`, or a parameter `ns` that shadows the import, is a different value and is not checked.

The rule needs type information (`parserOptions.project` or `projectService`); without it, it is silent. It is also silent for a key chosen at runtime (`ns[key]`), when the module does not resolve, and when the module is a CommonJS `export =` module.

### ❌ Incorrect

```ts
// ./math.ts: export const add = ...;
import * as math from './math';
math.subtract(1, 2);
math['multiply'](1, 2);
const { divide } = math;
```

### ✅ Correct

```ts
import * as math from './math';
math.add(1, 2);
const pick = (key: 'add') => math[key];
const run = (math: { subtract(): void }) => math.subtract();
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allowComputed": {
        "type": "boolean",
        "description": "eslint-plugin-import: true skips computed members of a namespace import (ns[key]); false reports each one. Absent: a string key is checked, a runtime key is not."
      }
    },
    "additionalProperties": false
  }
]
```

### eslint-plugin-import options

`allowComputed` (eslint-plugin-import's option, with its meaning) decides
what happens to a computed member of a namespace import, `ns[key]` or
`ns['a']`: `true` checks none of them; `false` reports each one as a
reference that cannot be validated, whatever its key. Absent, this rule's own
reading applies: a string key is checked like `ns.a`, and a runtime key is not
a finding (eslint-plugin-import's default is `false`).

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/namespace.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/namespace.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
