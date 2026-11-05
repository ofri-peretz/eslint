# no-deprecated

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Forbid imported names marked with @deprecated documentation tag

## Rule Details

Using an API whose declaration marks it deprecated is reported. The mark is a JSDoc `@deprecated` tag, a marker listed in `deprecationMarkers` (which adds to `@deprecated`, it does not replace it), or a `@deprecated` decorator.

- **Imported**: `import { old } from './api'` (also renamed, or the default) depends on a deprecated export and is reported at the import. Through a namespace import, each read of `ns.old` / `ns['old']` is reported. The other module is read through TypeScript, so imports are only judged with type information (`parserOptions.project` or `projectService`); without it, the other module is unknown and the rule is silent about imports.
- **Declared in the same file**: each use of the deprecated binding is reported (`old()`, `new Old()`, `Old.member`, `const v = old`). The rule decides by binding: a parameter or an object key that shares the name is not the deprecated item, and a deprecated declaration nobody uses is not a finding.

`allow` lists names that are never reported (for a migration period). `checkJSDoc: false` ignores JSDoc marks and `checkDecorators: false` ignores decorator marks.

### ❌ Incorrect

```ts
// ./api.ts
/** @deprecated Use fetchUser instead. */
export function getUser() {}

// app.ts
import { getUser } from './api';
```

```ts
/** @deprecated Use NewClient instead. */
class OldClient {}
new OldClient();
```

### ✅ Correct

```ts
import { fetchUser } from './api';

/** @deprecated Use NewClient instead. */
class OldClient {}
const config = { OldClient: true };
const build = (OldClient: () => void) => OldClient();
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "allow": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "description": "List of deprecated items that are allowed (for migration periods)"
      },
      "deprecationMarkers": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          "@deprecated"
        ],
        "description": "Custom deprecation markers to look for in comments"
      },
      "checkJSDoc": {
        "type": "boolean",
        "default": true,
        "description": "Check for @deprecated in JSDoc comments"
      },
      "checkDecorators": {
        "type": "boolean",
        "default": true,
        "description": "Check for @deprecated decorator in TypeScript"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-deprecated.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-deprecated.test.ts)

## OWASP Foundation

- **Category**: A09:2021 - Security Logging and Monitoring Failures
