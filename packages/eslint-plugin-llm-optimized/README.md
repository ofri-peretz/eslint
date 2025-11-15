# eslint-plugin-llm-optimized

**ESLint rules that AI assistants can actually fix.**

[![npm version](https://img.shields.io/npm/v/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/eslint-plugin-llm-optimized)
[![npm downloads](https://img.shields.io/npm/dm/eslint-plugin-llm-optimized.svg)](https://www.npmjs.com/package/eslint-plugin-llm-optimized)

This plugin provides ESLint rules with error messages optimized for both human developers and Large Language Models. Each rule is designed to be auto-fixable and includes structured context that enables AI assistants to understand the violation and apply consistent fixes.

**Core principle:** Every error message should teach, not just warn.

---

## Why This Works

Traditional ESLint rules communicate _what's wrong_. This plugin ensures every rule communicates _how to fix it_ in a way that both humans and AI can understand.

- **Deterministic fixes** - Same violation = same fix every time
- **Structured context** - CWE references, examples, documentation links
- **Lower review burden** - 60-80% of violations auto-fixed before human review
- **Faster onboarding** - New developers learn patterns from every error message

**For organizations scaling code quality:** See [ESLint + LLMs: Leadership Strategy](../../../docs/ESLINT_LEADERSHIP_STRATEGY.md) for implementation approaches, ROI calculations, and deployment strategies.

---

## 📢 Important Notes

> **💡 Tip:** This plugin works best when integrated with AI coding assistants. The structured error messages enable automatic fixes with minimal human intervention.

> **⚠️ Warning:** Some rules may flag patterns that are intentional in your codebase. Use inline comments to disable rules for specific cases when needed.

> **✅ Best Practice:** Start with the `recommended` configuration and gradually enable stricter rules as your team adapts to the patterns.

> **🚀 Quick Start:** For TypeScript projects, ensure you have `typescript-eslint` installed alongside this plugin for full compatibility.

---

## Rules

💼 Set in the `recommended` configuration.  
⚠️ Set to warn in the `recommended` configuration.  
🔧 Automatically fixable by the `--fix` CLI option.  
💡 Manually fixable by editor suggestions.  
❌ Deprecated.  
🎨 SonarQube-inspired rule.

### Development

| Name                                                                                                                    | Description                                       | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --- | --- | --- | --- |
| [no-console-log](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-console-log.md) | Disallow console.log with configurable strategies |     | ⚠️  | 🔧  |     |

### Architecture

| Name                                                                                                                                        | Description                                           | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --- | --- | --- | --- |
| [no-circular-dependencies](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-circular-dependencies.md) | Detect circular dependencies with full chain analysis | 💼  |     |     | 💡  |
| [no-internal-modules](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-internal-modules.md)           | Forbid importing internal/deep module paths           |     | ⚠️  |     | 💡  |

### Security

| Name                                                                                                                                                    | Description                                               | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --- | --- | --- | --- |
| [no-sql-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-sql-injection.md)                             | Prevent SQL injection with string concatenation detection | 💼  |     |     | 💡  |
| [no-unsafe-dynamic-require](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-unsafe-dynamic-require.md)           | Forbid dynamic require() calls with non-literal arguments | 💼  |     |     | 💡  |
| [database-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/database-injection.md) 🎨                      | Comprehensive injection detection (SQL, NoSQL, ORM)       | 💼  |     |     | 💡  |
| [detect-eval-with-expression](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-eval-with-expression.md)       | Detect eval() with dynamic expressions (RCE prevention)   | 💼  |     |     | 💡  |
| [detect-child-process](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-child-process.md)                     | Detect command injection in child_process calls           | 💼  |     |     | 💡  |
| [detect-non-literal-fs-filename](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-non-literal-fs-filename.md) | Detect path traversal in fs operations                    | 💼  |     |     | 💡  |
| [detect-non-literal-regexp](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-non-literal-regexp.md)           | Detect ReDoS vulnerabilities in RegExp construction       | 💼  |     |     | 💡  |
| [detect-object-injection](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/detect-object-injection.md)               | Detect prototype pollution in object property access      | 💼  |     |     | 💡  |

### Accessibility

| Name                                                                                                                        | Description                                    | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --- | --- | --- | --- |
| [img-requires-alt](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/img-requires-alt.md) | Enforce alt text on images for WCAG compliance |     | ⚠️  |     | 💡  |

### React

| Name                                                                                                                              | Description                                     | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | --- | --- | --- | --- |
| [required-attributes](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/required-attributes.md) | Enforce required attributes on React components |     | ⚠️  |     | 💡  |

### Performance

| Name                                                                                                                                          | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | --- | --- | --- | --- |
| [react-no-inline-functions](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-no-inline-functions.md) | Prevent inline functions in React renders |     | ⚠️  | 🔧  |     |

### Migration

| Name                                                                                                                                | Description                                       | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | --- | --- | --- | --- |
| [react-class-to-hooks](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/react-class-to-hooks.md) | Suggest migrating React class components to hooks |     | ⚠️  |     | 💡  |

### Deprecation

| Name                                                                                                                          | Description                                           | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | --- | --- | --- | --- |
| [no-deprecated-api](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/no-deprecated-api.md) | Prevent usage of deprecated APIs with migration paths |     | ⚠️  | 🔧  |     |

### Domain (DDD)

| Name                                                                                                                    | Description                                | 💼  | ⚠️  | 🔧  | 💡  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --- | --- | --- | --- |
| [enforce-naming](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/enforce-naming.md) | Enforce domain-specific naming conventions |     | ⚠️  | 🔧  |     |

### Complexity

| Name                                                                                                                                   | Description                                      | 💼  | ⚠️  | 🔧  | 💡  |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --- | --- | --- | --- |
| [cognitive-complexity](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/cognitive-complexity.md) 🎨 | Limit cognitive complexity with detailed metrics |     | ⚠️  |     | 💡  |

### Duplication

| Name                                                                                                                                 | Description                               | 💼  | ⚠️  | 🔧  | 💡  |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | --- | --- | --- | --- |
| [identical-functions](https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin/docs/rules/identical-functions.md) 🎨 | Detect duplicate function implementations |     | ⚠️  |     | 💡  |

---

## Installation

```bash
npm install --save-dev eslint-plugin-llm-optimized
# or
pnpm add -D eslint-plugin-llm-optimized
# or
yarn add -D eslint-plugin-llm-optimized
```

**Note:** For TypeScript projects, also install `typescript-eslint`:

```bash
npm install --save-dev typescript-eslint
```

---

## Configuration

### Flat Config (eslint.config.js) - Recommended

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';
import js from '@eslint/js';

export default [js.configs.recommended, llmOptimized.configs.recommended];
```

### With TypeScript

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';
import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  llmOptimized.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'llm-optimized/database-injection': 'error',
    },
  },
];
```

### Legacy Config (.eslintrc)

```json
{
  "extends": ["eslint:recommended", "plugin:llm-optimized/recommended"]
}
```

### Manual Configuration

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';

export default [
  {
    plugins: {
      'llm-optimized': llmOptimized,
    },
    rules: {
      'llm-optimized/no-sql-injection': 'error',
      'llm-optimized/no-console-log': 'warn',
    },
  },
];
```

---

## Preset Configs

- **`recommended`** - Balanced rules for most projects
- **`strict`** - All rules as errors
- **`security`** - Security-focused rules only
- **`react`** - React-specific rules
- **`sonarqube`** - SonarQube-inspired rules

---

## Integration with AI Assistants

When using this plugin with AI tools (Copilot, Cursor, Claude, etc.):

```typescript
// ✅ ESLint detects the issue with LLM-optimized message:
// 🚨 SQL Injection (CWE-89) | Severity: Critical
// ❌ const query = `SELECT * WHERE id = ${userId}`;
// ✅ const query = 'SELECT * WHERE id = ?'; db.query(query, [userId]);

// Developer or AI: "Fix lint errors"
// Result: Automatic, consistent fixes applied
```

Enable auto-fix in your CI/CD:

```yaml
# .github/workflows/lint.yml
- run: npm run eslint -- --fix
```

---

## Use Cases

### Security-First Teams

Enforce security patterns across all code:

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.security,
  {
    rules: {
      'llm-optimized/detect-eval-with-expression': 'error',
      'llm-optimized/no-sql-injection': 'error',
    },
  },
];
```

### React Codebases

Include React-specific rules:

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.react,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      'llm-optimized/react-no-inline-functions': 'warn',
    },
  },
];
```

### Legacy Modernization

Use warnings to guide gradual migrations:

```javascript
import llmOptimized from 'eslint-plugin-llm-optimized';

export default [
  llmOptimized.configs.recommended,
  {
    rules: {
      'llm-optimized/react-class-to-hooks': 'warn',
      'llm-optimized/no-deprecated-api': 'warn',
    },
  },
];
```

---

## Performance & Compatibility

| Metric         | Value              |
| -------------- | ------------------ |
| Avg lint time  | 30-50ms per file   |
| ESLint version | ^8.0.0 \|\| ^9.0.0 |
| TypeScript     | >=4.0.0            |
| Node.js        | >=18.0.0           |

---

## FAQ

**Q: Will this slow down my linting?**  
A: No. Rules use efficient AST traversal with caching. Measured overhead: <10ms per file.

**Q: Can I use this without AI?**  
A: Yes. The rules work standalone with better error messages and auto-fixes than standard alternatives.

**Q: How do I disable a rule for a specific case?**  
A: Use inline comments:

```javascript
// eslint-disable-next-line llm-optimized/no-sql-injection
const result = db.query(userProvidedProcedure);
```

**Q: Does this replace other ESLint plugins?**  
A: No. Use alongside `@typescript-eslint`, `eslint-plugin-import`, etc.

**Q: Can I customize the rules?**  
A: Yes. Each rule can be configured with options. See individual rule documentation.

---

## 📦 Package Information

> **🔬 A/B Test Package:** This package (`eslint-plugin-llm-optimized`) is an A/B test and serves as a barrel export for the original package `@forge-js/eslint-plugin-llm-optimized`.
>
> Both packages provide identical functionality. This package exists to test discoverability and adoption patterns. You can use either package name - they are functionally equivalent.

**Package Options:**

- `eslint-plugin-llm-optimized` (this package - A/B test)
- `@forge-js/eslint-plugin-llm-optimized` (original package)

---

## Related Packages

- **[@forge-js/eslint-plugin-utils](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)** - Build your own LLM-optimized rules
- **[@typescript-eslint/eslint-plugin](https://www.npmjs.com/package/@typescript-eslint/eslint-plugin)** - TypeScript-specific rules
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** - Import/export validation

---

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/ofri-peretz/forge-js/blob/main/CONTRIBUTING.md).

**Areas of interest:**

- New rule ideas (especially with auto-fixes)
- Performance optimizations
- Bug reports and fixes
- Documentation improvements

---

## For Teams & Organizations

Managing code quality across teams? Check out [ESLint + LLMs: Leadership Strategy](../../../docs/ESLINT_LEADERSHIP_STRATEGY.md) for:

- Standards enforcement patterns
- Implementation roadmaps
- Metrics and ROI calculations
- Multi-team governance models

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

---

## Sponsors

If this plugin saves you time, consider sponsoring:

- [GitHub Sponsors](https://github.com/sponsors/ofri-peretz)
- [Open Collective](https://opencollective.com/forge-js)
