# no-barrel-file

💼 This rule is enabled in the following configs: `recommended`, `typescript`.

<!-- end auto-generated rule header -->

Disallow barrel files that harm build performance and tree-shaking efficiency

## Rule Details

A barrel file only re-exports other modules. Every import of it loads all of
them, which slows builds and defeats tree-shaking. This rule reports a barrel
candidate that passes through too many modules.

A barrel candidate is a file matching `barrelPatterns` (default: an
`index.ts` / `.tsx` / `.js` / `.jsx` / `.mts` / `.mjs` file) and no
`allowedPaths` entry. It is reported when it re-exports at least `threshold`
(default 3) distinct modules and either:

- has no local export (`barrelFileDetected`), or
- has local exports, `allowWithLocalExports` is `false`, and re-export
  declarations make up at least `reexportRatio` (default 0.8) of its export
  declarations (`considerDirectExports`).

A re-export is any way a module's runtime binding is passed through:
`export * from`, `export * as ns from`, `export { a } from`, and an imported
binding exported again (`import { a } from './a'; export { a };`,
`import * as ns from './a'; export { ns };`,
`import a from './a'; export default a;`). A type-only re-export
(`export type * from`, `export type { T } from`, an `import type` binding
exported again) is erased at compile time and is not counted.

```ts
// ❌ Incorrect: src/components/index.ts
export * from './Button';
export * from './Card';
export { Modal } from './Modal';

// ✅ Correct: consumers import './components/Button' directly, or the file
// holds real code alongside one or two re-exports
export * from './Button';
export const theme = createTheme();
```

## Options

```json
[
  {
    "type": "object",
    "properties": {
      "threshold": {
        "type": "number",
        "minimum": 1,
        "default": 3,
        "description": "Minimum number of re-exports to consider a file a barrel"
      },
      "allowedPaths": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [],
        "description": "Regex patterns for paths where barrel files are allowed"
      },
      "barrelPatterns": {
        "type": "array",
        "items": {
          "type": "string"
        },
        "default": [
          ".*[/\\\\]index\\.(ts|tsx|js|jsx|mts|mjs)$"
        ],
        "description": "File patterns considered barrel candidates"
      },
      "allowWithLocalExports": {
        "type": "boolean",
        "default": false,
        "description": "Allow barrel files that also export local declarations"
      },
      "reexportRatio": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "default": 0.8,
        "description": "Maximum allowed ratio of re-exports to total exports"
      }
    },
    "additionalProperties": false
  }
]
```

## Implementation

- [Source Code](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/rules/no-barrel-file.ts)
- [Test Cases](https://github.com/import-js/eslint-plugin-import-next/blob/main/src/tests/no-barrel-file.test.ts)

## OWASP Foundation

- **Category**: A00:2021 - General Security
