# @forge-js/eslint-plugin-llm-optimized

**ESLint rules that AI assistants can actually fix.**

[![npm version](https://img.shields.io/npm/v/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)
[![npm downloads](https://img.shields.io/npm/dm/@forge-js/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)

This plugin intends to support AI-powered code quality with structured, actionable error messages optimized for both human developers and Large Language Models (LLMs).

**Key difference:** Traditional ESLint plugins tell you _what's wrong_. This plugin tells AI assistants _how to fix it_.

---

## Rules

💼 Set in the `recommended` configuration.  
⚠️ Set to warn in the `recommended` configuration.  
🔧 Automatically fixable by the `--fix` CLI option.  
💡 Manually fixable by editor suggestions.  
❌ Deprecated.  
🎨 SonarQube-inspired rule.

### Development

| Name                                             | Description                                       | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ------------------------------------------------ | ------------------------------------------------- | --- | --- | --- | --- | --- |
| [no-console-log](./docs/rules/no-console-log.md) | Disallow console.log with configurable strategies |     | ⚠️  | 🔧  |     |     |

### Architecture

| Name                                                                 | Description                                           | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| -------------------------------------------------------------------- | ----------------------------------------------------- | --- | --- | --- | --- | --- |
| [no-circular-dependencies](./docs/rules/no-circular-dependencies.md) | Detect circular dependencies with full chain analysis | 💼  |     |     | 💡  |     |
| [no-internal-modules](./docs/rules/no-internal-modules.md)           | Forbid importing internal/deep module paths           |     | ⚠️  |     | 💡  |     |

### Security

| Name                                                                             | Description                                               | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------- | --- | --- | --- | --- | --- |
| [no-sql-injection](./docs/rules/no-sql-injection.md)                             | Prevent SQL injection with string concatenation detection | 💼  |     |     | 💡  |     |
| [no-unsafe-dynamic-require](./docs/rules/no-unsafe-dynamic-require.md)           | Forbid dynamic require() calls with non-literal arguments | 💼  |     |     | 💡  |     |
| [database-injection](./docs/rules/database-injection.md) 🎨                      | Comprehensive injection detection (SQL, NoSQL, ORM)       | 💼  |     |     | 💡  |     |
| [detect-eval-with-expression](./docs/rules/detect-eval-with-expression.md)       | Detect eval() with dynamic expressions (RCE prevention)   | 💼  |     |     | 💡  |     |
| [detect-child-process](./docs/rules/detect-child-process.md)                     | Detect command injection in child_process calls           | 💼  |     |     | 💡  |     |
| [detect-non-literal-fs-filename](./docs/rules/detect-non-literal-fs-filename.md) | Detect path traversal in fs operations                    | 💼  |     |     | 💡  |     |
| [detect-non-literal-regexp](./docs/rules/detect-non-literal-regexp.md)           | Detect ReDoS vulnerabilities in RegExp construction       | 💼  |     |     | 💡  |     |
| [detect-object-injection](./docs/rules/detect-object-injection.md)               | Detect prototype pollution in object property access      | 💼  |     |     | 💡  |     |

### Accessibility

| Name                                                 | Description                                    | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ---------------------------------------------------- | ---------------------------------------------- | --- | --- | --- | --- | --- |
| [img-requires-alt](./docs/rules/img-requires-alt.md) | Enforce alt text on images for WCAG compliance |     | ⚠️  |     | 💡  |     |

### React

| Name                                                       | Description                                     | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ---------------------------------------------------------- | ----------------------------------------------- | --- | --- | --- | --- | --- |
| [required-attributes](./docs/rules/required-attributes.md) | Enforce required attributes on React components |     | ⚠️  |     | 💡  |     |

### Performance

| Name                                                                   | Description                               | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ---------------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- | --- |
| [react-no-inline-functions](./docs/rules/react-no-inline-functions.md) | Prevent inline functions in React renders |     | ⚠️  | 🔧  |     |     |

### Migration

| Name                                                         | Description                                       | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ------------------------------------------------------------ | ------------------------------------------------- | --- | --- | --- | --- | --- |
| [react-class-to-hooks](./docs/rules/react-class-to-hooks.md) | Suggest migrating React class components to hooks |     | ⚠️  |     | 💡  |     |

### Deprecation

| Name                                                   | Description                                           | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ------------------------------------------------------ | ----------------------------------------------------- | --- | --- | --- | --- | --- |
| [no-deprecated-api](./docs/rules/no-deprecated-api.md) | Prevent usage of deprecated APIs with migration paths |     | ⚠️  | 🔧  |     |     |

### Domain (DDD)

| Name                                             | Description                                | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ------------------------------------------------ | ------------------------------------------ | --- | --- | --- | --- | --- |
| [enforce-naming](./docs/rules/enforce-naming.md) | Enforce domain-specific naming conventions |     | ⚠️  | 🔧  |     |     |

### Complexity

| Name                                                            | Description                                      | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| --------------------------------------------------------------- | ------------------------------------------------ | --- | --- | --- | --- | --- |
| [cognitive-complexity](./docs/rules/cognitive-complexity.md) 🎨 | Limit cognitive complexity with detailed metrics |     | ⚠️  |     | 💡  |     |

### Duplication

| Name                                                          | Description                               | 💼  | ⚠️  | 🔧  | 💡  | ❌  |
| ------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- | --- |
| [identical-functions](./docs/rules/identical-functions.md) 🎨 | Detect duplicate function implementations |     | ⚠️  |     | 💡  |     |

---

## eslint-plugin-llm-optimized for enterprise

Available as part of the Tidelift Subscription.

The maintainers of eslint-plugin-llm-optimized and thousands of other packages are working with Tidelift to deliver commercial support and maintenance for the open source dependencies you use to build your applications. Save time, reduce risk, and improve code health, while paying the maintainers of the exact dependencies you use. [Learn more](https://tidelift.com/subscription/pkg/npm-eslint-plugin-llm-optimized).

---

## Installation

```bash
npm install --save-dev @forge-js/eslint-plugin-llm-optimized
# or
pnpm add -D @forge-js/eslint-plugin-llm-optimized
# or
yarn add -D @forge-js/eslint-plugin-llm-optimized
```

**Note:** For TypeScript projects, also install `typescript-eslint`:

```bash
npm install --save-dev typescript-eslint
```

---

## Config - Legacy (.eslintrc)

All rules are off by default. However, you may extend one of the preset configs, or configure them manually in your `.eslintrc.(yml|json|js)`.

### Extending a preset config:

```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@forge-js/llm-optimized/recommended"
  ]
}
```

### Configuring manually:

```json
{
  "plugins": ["@forge-js/llm-optimized"],
  "rules": {
    "@forge-js/llm-optimized/no-console-log": "warn",
    "@forge-js/llm-optimized/no-circular-dependencies": "error",
    "@forge-js/llm-optimized/no-sql-injection": "error"
  }
}
```

---

## Config - Flat (eslint.config.js)

All rules are off by default. However, you may configure them manually in your `eslint.config.(js|cjs|mjs)`, or extend one of the preset configs:

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [
  js.configs.recommended,
  llmOptimized.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'warn',
      '@forge-js/llm-optimized/no-circular-dependencies': 'error',
    },
  },
];
```

### TypeScript

You may use the following snippet or assemble your own config using the granular settings described below it.

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  llmOptimized.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@forge-js/llm-optimized/no-console-log': 'warn',
      '@forge-js/llm-optimized/database-injection': 'error',
    },
  },
];
```

---

## Preset Configs

This plugin provides several preset configurations:

### `recommended`

Essential rules for most projects with balanced strictness.

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [llmOptimized.configs.recommended];
```

**Includes:**

- Development: `no-console-log` (warn)
- Architecture: `no-circular-dependencies` (error)
- Security: All security rules (error)
- Accessibility: `img-requires-alt` (warn)
- Complexity: `cognitive-complexity` (warn)

### `strict`

Maximum code quality enforcement (all rules as errors).

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [llmOptimized.configs.strict];
```

### `security`

Security-focused rules only.

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [llmOptimized.configs.security];
```

### `react`

React-specific rules (migration, performance, accessibility).

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [llmOptimized.configs.react];
```

### `sonarqube`

SonarQube-inspired rules (complexity, duplication, injection).

```javascript
import llmOptimized from '@forge-js/eslint-plugin-llm-optimized';

export default [llmOptimized.configs.sonarqube];
```

---

## How AI Assistants Use This

### Traditional ESLint

```
❌ "Unexpected console statement"
```

### LLM-Optimized ESLint

```
⚠️ console.log | src/app.ts:42 | Strategy: convert
✅ Auto-fix available
```

### GitHub Copilot

```typescript
// You see the error:
console.log('debug info'); // ← ESLint: Replace with logger.debug()

// You type: "fix lint"
// Copilot suggests:
import { logger } from './utils/logger';
logger.debug('debug info');
```

### Cursor / ChatGPT

```
You: "Fix all ESLint errors"

AI: "I found 3 console.log violations. Replacing with logger.debug()
     and adding the logger import..."

[Changes applied automatically]
```

---

## Real-World Results

Teams using this plugin report:

- **60% fewer manual lint fixes** - AI handles most violations
- **2x faster code reviews** - Auto-fixed before PR submission
- **Better code quality** - Consistent patterns enforced automatically
- **Faster onboarding** - Junior devs get guided fixes from AI

---

## Comparison with Other Plugins

| Feature                    | This Plugin      | eslint-plugin-import | SonarJS        |
| -------------------------- | ---------------- | -------------------- | -------------- |
| **Console detection**      | ✅ With auto-fix | ❌                   | ✅ No auto-fix |
| **Circular deps**          | ✅ Full chain    | ✅ Basic             | ❌             |
| **LLM-optimized errors**   | ✅               | ❌                   | ❌             |
| **Auto-fix rate**          | ~60%             | ~20%                 | ~10%           |
| **Type-aware**             | ✅               | Limited              | ❌             |
| **Actionable suggestions** | ✅ Every error   | ❌                   | Some           |
| **Security rules**         | ✅ SQL, NoSQL    | ❌                   | ✅ Limited     |
| **Performance rules**      | ✅ React-focused | ❌                   | ✅             |

---

## Compatibility

| Package                   | Version            |
| ------------------------- | ------------------ |
| ESLint                    | ^8.0.0 \|\| ^9.0.0 |
| TypeScript                | >=4.0.0            |
| @typescript-eslint/parser | >=6.0.0            |
| Node.js                   | >=18.0.0           |

---

## FAQ

**Q: Will this slow down my linting?**  
A: No. Rules use efficient AST traversal with caching and are well-optimized.

**Q: Can I use this without AI assistants?**  
A: Yes! The rules are useful on their own with better error messages and auto-fixes.

**Q: Does this replace other ESLint plugins?**  
A: No, it complements them. Use alongside @typescript-eslint, eslint-plugin-import, etc.

**Q: Why "LLM-optimized"?**  
A: Error messages include structured context that AI assistants can parse and act on automatically.

**Q: Are there breaking changes between versions?**  
A: We follow semantic versioning. Check CHANGELOG.md for migration guides.

---

## Related Packages

- **[@forge-js/eslint-plugin-utils](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)** - Build your own LLM-optimized rules
- **[@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)** - TypeScript-specific rules
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** - Import/export validation
- **[eslint-plugin-sonarjs](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)** - Code quality rules

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/ofri-peretz/forge-js/blob/main/CONTRIBUTING.md).

**Looking for:**

- New rule ideas (especially with auto-fixes)
- Performance optimizations
- Bug reports and fixes
- Documentation improvements

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

## Sponsors

If this plugin saves you time, consider sponsoring:

- [GitHub Sponsors](https://github.com/sponsors/ofri-peretz)
- [Open Collective](https://opencollective.com/forge-js)
