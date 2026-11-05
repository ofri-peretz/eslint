# prefer-direct-import

💼 This rule is enabled in the following configs: `recommended`, `typescript`.
🔧 This rule is automatically fixable by the `--fix` CLI option.
💡 This rule is manually fixable by editor suggestions.

<!-- end auto-generated rule header -->

Prefer direct imports over barrel imports for better tree-shaking and build performance

## Rule Details

Reports a named import from a barrel that `mappings` describes, and rewrites
it to the direct module. Each mapping names a barrel specifier (`barrel`, a
regular expression) and the direct path of one export (`directPath`, where
`{name}` is the imported name).

Reported: `import { Button } from '@/ui'`, a renamed specifier, several
specifiers (one report each; fixed only when there is one), the value
specifiers of an import that mixes in inline `type` ones, and
`export { Button } from '@/ui'`. With `autoFix: true` (the default) a single
specifier is fixed; with `false` the rewrite is offered as a suggestion.

Not reported: a specifier no mapping names, a path already direct, default,
namespace and side-effect imports and `export *` (no export name to map),
type-only imports (`import type`, all-inline `type`: erased), `require()` and
`import()`.

Without `mappings`, the rule applies built-in mappings for `@/components`,
`@/hooks`, `@/utils`, `@/lib`, `~/components` and `~/hooks` to
`<barrel>/<name>`. Configure `mappings` to match your layout: the rewrite
does not check that the direct module exists.

```ts
// { mappings: [{ barrel: '^@/ui$', directPath: '@/ui/{name}' }] }

// ❌ Incorrect
import { Button } from '@/ui';

// ✅ Correct
import { Button } from '@/ui/Button';
import type { Props } from '@/ui';
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "mappings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "barrel": {
              "type": "string"
            },
            "directPath": {
              "type": "string"
            }
          },
          "required": [
            "barrel",
            "directPath"
          ]
        },
        "default": [],
        "description": "Mapping of barrel paths to direct import patterns"
      },
      "autoFix": {
        "type": "boolean",
        "default": true,
        "description": "Auto-fix the imports when possible"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/prefer-direct-import.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/prefer-direct-import.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
