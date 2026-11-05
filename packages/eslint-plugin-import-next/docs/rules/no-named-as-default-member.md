# no-named-as-default-member

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Forbid use of exported name as property of default export

## Rule Details

Reading a named export as a property of the module's default import is reported: after `import foo from './m'`, `foo.bar` where `./m` exports `bar` should be `import { bar } from './m'`.

The rule does not read the other module. The evidence that `./m` exports `bar` is this file taking `bar` from the same module: in the default's own declaration (`import foo, { bar } from './m'`), in another import (plain, or renamed `{ bar as b }`), or in a re-export (`export { bar } from './m'`). The default can be spelled `import foo` or `import { default as foo }`. The read can be `foo.bar`, `foo['bar']` or `const { bar } = foo`.

The rule decides by binding: a parameter or local `foo` that shadows the import is a different value. Not reported: a key chosen at runtime (`foo[key]`), and a name taken from a different module.

### ❌ Incorrect

```ts
import api, { fetchUser } from './api';
api.fetchUser(1);
api['fetchUser'](1);
const { fetchUser: load } = api;
```

### ✅ Correct

```ts
import api, { fetchUser } from './api';
fetchUser(1);
api.version;
const call = (api: { fetchUser(): void }) => api.fetchUser();
```

## Options

```json
[]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-named-as-default-member.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-named-as-default-member.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
