<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-devkit" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://oxc.rs" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/oxlint-dark.svg"><img src="https://eslint.interlace.tools/logos/oxlint-light.svg" alt="oxlint" height="90" /></picture></a>
  &nbsp;&nbsp;
  <a href="https://eslint.org" target="_blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/eslint-dark.svg"><img src="https://eslint.interlace.tools/logos/eslint-light.svg" alt="ESLint" height="90" /></picture></a>
</p>

# @interlace/eslint-devkit

**Build ESLint plugins that write themselves** - TypeScript utilities for creating rules that AI assistants can understand and auto-fix.

[![npm version](https://img.shields.io/npm/v/@interlace/eslint-devkit.svg)](https://www.npmjs.com/package/@interlace/eslint-devkit)
[![npm downloads](https://img.shields.io/npm/dm/@interlace/eslint-devkit.svg)](https://www.npmjs.com/package/@interlace/eslint-devkit)
[![Install Size](https://badgen.net/packagephobia/install/@interlace/eslint-devkit)](https://packagephobia.com/result?p=@interlace/eslint-devkit)
[![codecov](https://codecov.io/gh/ofri-peretz/eslint/graph/badge.svg?flag=eslint-devkit)](https://app.codecov.io/gh/ofri-peretz/eslint/tree/main)

> **Keywords:** ESLint utilities, LLM-optimized, AI assistant, auto-fix, TypeScript ESLint, AST utilities, type checking, rule creation, GitHub Copilot, Cursor AI, Claude AI, structured error messages, deterministic fixes

## What is this?

Most ESLint utilities help you **write rules**. This package helps you write rules that **LLMs can fix automatically**.

**Core principle:** Every error message should teach, not just warn.

Inspired by [@typescript-eslint/utils](https://typescript-eslint.io/packages/utils/), enhanced for the AI-assisted development era.

---

## 🚀 Quick Start

Create your first LLM-optimized rule in 2 minutes:

### Step 1: Install

```bash
npm install --save-dev @interlace/eslint-devkit @typescript-eslint/parser typescript
# or
npm add -D @interlace/eslint-devkit @typescript-eslint/parser typescript
# or
yarn add -D @interlace/eslint-devkit @typescript-eslint/parser typescript
```

### Step 2: Create Your Rule

```typescript
import { createRule, isMemberExpression } from '@interlace/eslint-devkit';

export default createRule({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.log - use logger.debug() instead',
      recommended: 'warn',
    },
    fixable: 'code',
    messages: {
      useLogger: 'Replace console.log with logger.debug() on line {{line}}',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (isMemberExpression(node.callee, 'console', 'log')) {
          context.report({
            node,
            messageId: 'useLogger',
            data: { line: node.loc.start.line },
            fix(fixer) {
              return fixer.replaceText(node.callee, 'logger.debug');
            },
          });
        }
      },
    };
  },
});
```

**That's it!** Your rule now provides structured error messages that AI assistants can automatically fix.

### Step 3: Use in ESLint Config

```typescript
// eslint.config.js
import myPlugin from './my-plugin';

export default [
  {
    plugins: {
      'my-plugin': myPlugin,
    },
    rules: {
      'my-plugin/no-console-log': 'warn',
    },
  },
];
```

---

## Why LLM-Optimized Matters

### Traditional ESLint Rule

```typescript
// Error output
{
  message: "Unexpected console statement",
  line: 42
}

// AI Assistant thinks: "Remove it? Comment it? Replace with what?"
// Result: ❌ AI can't fix it automatically
```

### LLM-Optimized Rule

```typescript
// Error output
{
  message: "Replace console.log with logger.debug() on line 42",
  line: 42,
  fix: { /* auto-fix available */ }
}

// AI Assistant thinks: "Replace with logger.debug(), add import if needed"
// Result: ✅ AI auto-applies fix
```

**Key Benefits:**

- **60-80% auto-fix rate** vs 20-30% for traditional rules
- **Deterministic fixes** - Same violation = same fix every time
- **Lower review burden** - Most violations fixed before human review
- **Faster onboarding** - Developers learn patterns from error messages

---

## 📈 Benchmarks

Rules built with this utility package achieve:

| Metric                  | LLM-Optimized Rules | Standard ESLint Rules |
| ----------------------- | ------------------- | --------------------- |
| **AI Fix Success Rate** | 94%                 | 67%                   |
| **First Attempt Fix**   | 89%                 | 52%                   |
| **Parse Success Rate**  | 100%                | 100%                  |
| **Field Extraction**    | 100%                | 23%                   |

### Enterprise Features Included

| Feature                 | Support Level  | Description                           |
| ----------------------- | -------------- | ------------------------------------- |
| **SARIF Export**        | ✅ Full        | GitHub Advanced Security integration  |
| **CWE Auto-Enrichment** | ✅ Automatic   | Security benchmarks from CWE ID       |
| **OWASP Mapping**       | ✅ 2021 + 2025 | Forward-compatible security standards |
| **Compliance Tags**     | ✅ Auto        | SOC2, HIPAA, PCI-DSS, GDPR, ISO27001  |

> 📊 **[Full Benchmarks →](https://github.com/ofri-peretz/eslint/blob/main/docs/BENCHMARK.md)**

---

## Installation

```bash
npm install --save-dev @interlace/eslint-devkit
```

**Peer dependencies (required):**

```bash
npm install --save-dev @typescript-eslint/parser typescript
npm install --save-dev @typescript-eslint/utils
```

### Optional: Resolver helpers

If you need module resolution utilities, use the dedicated entry point and opt into the resolver peer deps:

```bash
npm install --save-dev get-tsconfig enhanced-resolve
```

```ts
import { createResolver } from '@interlace/eslint-devkit/resolver';
```

If you don’t import `@interlace/eslint-devkit/resolver`, the resolver code and peer deps stay out of your bundle/install surface.

---

## API Reference

### Rule Creation

#### `createRule(options)`

Creates a well-typed ESLint rule with automatic documentation links.

**Parameters:**

- `name` (string): Rule name (e.g., 'no-console-log')
- `meta` (object): Rule metadata (type, docs, messages, schema)
- `defaultOptions` (array): Default rule options
- `create` (function): Rule implementation function

**Returns:** ESLint rule object

**Example:**

```typescript
import { createRule } from '@interlace/eslint-devkit';

const rule = createRule({
  name: 'my-rule',
  meta: {
    type: 'problem',
    docs: { description: 'My custom rule' },
    messages: { error: 'Error message' },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      // Your rule implementation
    };
  },
});
```

#### `createRuleCreator(urlCreator)`

Creates a custom rule factory with your documentation URL pattern.

**Parameters:**

- `urlCreator` (function): Function that takes rule name and returns documentation URL

**Returns:** Rule creation function

**Example:**

```typescript
import { createRuleCreator } from '@interlace/eslint-devkit';

const createRule = createRuleCreator(
  (ruleName) => `https://your-plugin.dev/rules/${ruleName}`,
);

export default createRule({
  name: 'my-rule',
  // ...
});
```

---

### AST Utilities

Helper functions for traversing and analyzing ESTree/TSESTree nodes.

#### Node Type Checks

| Function                   | Description                        | Example                            |
| -------------------------- | ---------------------------------- | ---------------------------------- |
| `isNodeOfType(node, type)` | Type guard for AST nodes           | `isNodeOfType(node, 'Identifier')` |
| `isFunctionNode(node)`     | Check if node is any function type | `isFunctionNode(node)`             |
| `isClassNode(node)`        | Check if node is a class           | `isClassNode(node)`                |
| `isLiteral(node)`          | Check if literal value             | `isLiteral(node)`                  |
| `isTemplateLiteral(node)`  | Check if template literal          | `isTemplateLiteral(node)`          |

#### Pattern Matching

| Function                                     | Description                       | Example                                      |
| -------------------------------------------- | --------------------------------- | -------------------------------------------- |
| `isMemberExpression(node, object, property)` | Match patterns like `console.log` | `isMemberExpression(node, 'console', 'log')` |
| `isCallExpression(node, name)`               | Check function call by name       | `isCallExpression(node, 'fetch')`            |

#### Value Extraction

| Function                  | Description             | Example                              |
| ------------------------- | ----------------------- | ------------------------------------ |
| `getIdentifierName(node)` | Extract identifier name | `getIdentifierName(node) // 'myVar'` |
| `getFunctionName(node)`   | Get function name       | `getFunctionName(node) // 'myFunc'`  |
| `getStaticValue(node)`    | Extract static value    | `getStaticValue(node) // 'hello'`    |

#### Ancestor Navigation

| Function                                    | Description                     | Example                                               |
| ------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `isInsideNode(node, parentType, ancestors)` | Check if inside specific parent | `isInsideNode(node, 'TryStatement', ancestors)`       |
| `getAncestorOfType(type, ancestors)`        | Find first ancestor of type     | `getAncestorOfType('FunctionDeclaration', ancestors)` |

**Complete Example:**

```typescript
import {
  isMemberExpression,
  isInsideNode,
  getAncestorOfType,
  getIdentifierName,
} from '@interlace/eslint-devkit';

create(context) {
  return {
    CallExpression(node) {
      // Detect console.log() calls
      if (isMemberExpression(node.callee, 'console', 'log')) {
        // Check if inside try-catch (might be intentional logging)
        const ancestors = context.getAncestors();
        const insideTry = isInsideNode(node, 'TryStatement', ancestors);

        if (!insideTry) {
          const functionAncestor = getAncestorOfType('FunctionDeclaration', ancestors);
          const functionName = functionAncestor
            ? getIdentifierName(functionAncestor.id)
            : 'anonymous';

          context.report({
            node,
            message: `Avoid console.log outside error handlers in ${functionName}`,
          });
        }
      }
    },
  };
}
```

---

### Type Utilities

Type-aware analysis using TypeScript compiler API. These utilities require TypeScript parser services.

#### Service Access

| Function                        | Description                                 | Example                                       |
| ------------------------------- | ------------------------------------------- | --------------------------------------------- |
| `hasParserServices(context)`    | Check if type info available                | `if (hasParserServices(context))`             |
| `getParserServices(context)`    | Get parser services (throws if unavailable) | `const services = getParserServices(context)` |
| `getTypeOfNode(node, services)` | Get TypeScript type of node                 | `const type = getTypeOfNode(node, services)`  |

#### Type Checks

| Function                          | Description                | Example                           |
| --------------------------------- | -------------------------- | --------------------------------- |
| `isStringType(type)`              | Check if type is string    | `isStringType(type)`              |
| `isNumberType(type)`              | Check if type is number    | `isNumberType(type)`              |
| `isBooleanType(type)`             | Check if type is boolean   | `isBooleanType(type)`             |
| `isArrayType(type, checker)`      | Check if type is array     | `isArrayType(type, checker)`      |
| `isPromiseType(type, checker)`    | Check if type is Promise   | `isPromiseType(type, checker)`    |
| `isAnyType(type)`                 | Check if type is any       | `isAnyType(type)`                 |
| `isUnknownType(type)`             | Check if type is unknown   | `isUnknownType(type)`             |
| `isNullableType(type)`            | Check if type is nullable  | `isNullableType(type)`            |
| `getTypeArguments(type, checker)` | Get generic type arguments | `getTypeArguments(type, checker)` |

**Complete Example:**

```typescript
import {
  hasParserServices,
  getParserServices,
  getTypeOfNode,
  isPromiseType,
} from '@interlace/eslint-devkit';

create(context) {
  // Gracefully handle projects without TypeScript
  if (!hasParserServices(context)) {
    return {};
  }

  const services = getParserServices(context);
  const checker = services.program.getTypeChecker();

  return {
    CallExpression(node) {
      const type = getTypeOfNode(node, services);

      // Detect unawaited promises by TYPE, not syntax
      if (isPromiseType(type, checker)) {
        const parent = node.parent;
        const isAwaited = parent?.type === 'AwaitExpression';

        if (!isAwaited) {
          context.report({
            node,
            message: 'Promise is not awaited - add "await" or handle with .then()',
            fix(fixer) {
              return fixer.insertTextBefore(node, 'await ');
            },
          });
        }
      }
    },
  };
}
```

---

## Best Practices

### 1. Provide Specific Error Messages

```typescript
// ❌ Vague - AI can't determine fix
message: 'Invalid usage';

// ✅ Specific - AI knows exactly what to do
message: 'Replace fetch() with apiClient.get() for automatic error handling';
```

### 2. Include Auto-Fixes When Possible

```typescript
context.report({
  node,
  message: 'Use const instead of let for immutable variables',
  fix(fixer) {
    return fixer.replaceText(letToken, 'const');
  },
});
```

### 3. Structure Error Data for AI

```typescript
context.report({
  node,
  messageId: 'circularDependency',
  data: {
    chain: 'A.ts → B.ts → C.ts → A.ts',
    breakAt: 'C.ts',
    suggestion: 'Extract shared types to types.ts',
  },
});
```

### 4. Use Type Information When Available

```typescript
// Detect issues semantically, not just syntactically
if (hasParserServices(context)) {
  const type = getTypeOfNode(node, services);
  if (isPromiseType(type, checker)) {
    // Type-aware detection is more accurate
  }
}
```

### 5. Provide Context in Messages

```typescript
// ❌ Missing context
message: 'Use logger instead';

// ✅ Includes context
message: 'Replace console.log with logger.debug() on line {{line}} in function {{functionName}}';
```

---

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createRule,
  isMemberExpression,
  type RuleContext,
} from '@interlace/eslint-devkit';

// Fully typed rule creation
const rule = createRule<[], 'messageId'>({
  name: 'my-rule',
  meta: {
    type: 'problem',
    messages: {
      messageId: 'Error message',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context: RuleContext<'messageId', []>) {
    return {
      Identifier(node: TSESTree.Identifier) {
        // Fully typed node visitors
      },
    };
  },
});
```

---

## Compatibility

| Package                   | Version                       |
| ------------------------- | ----------------------------- |
| ESLint                    | ^8.40.0 \|\| ^9.0.0 \|\| ^10.0.0 |
| TypeScript                | >=4.0.0                       |
| @typescript-eslint/parser | >=6.0.0                       |
| @typescript-eslint/utils  | ^8.0.0                        |
| Node.js                   | >=18.0.0                      |

See the [ESLint Version Support Policy](../../docs/ESLINT_VERSION_SUPPORT.md) for current ecosystem share data and the rules that determine which majors are supported.

---

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:START - Do not edit manually -->

## 🔗 Related ESLint Plugins

Part of the **Interlace ESLint ecosystem** — AI-native rules with LLM-optimized error messages:

**Security**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-anthropic-security`](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-anthropic-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-anthropic-security) | Anthropic SDK security. |
| [`eslint-plugin-browser-security`](https://www.npmjs.com/package/eslint-plugin-browser-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-browser-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-browser-security) | XSS, DOM security. |
| [`eslint-plugin-drizzle-security`](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-drizzle-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-drizzle-security) | Drizzle security. |
| [`eslint-plugin-express-security`](https://www.npmjs.com/package/eslint-plugin-express-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-express-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-express-security) | Express middleware hardening. |
| [`eslint-plugin-gemini-security`](https://www.npmjs.com/package/eslint-plugin-gemini-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-gemini-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-gemini-security) | Google Gemini SDK security. |
| [`eslint-plugin-jwt-security`](https://www.npmjs.com/package/eslint-plugin-jwt-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-jwt-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-jwt-security) | Token security. |
| [`eslint-plugin-knex-security`](https://www.npmjs.com/package/eslint-plugin-knex-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-knex-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-knex-security) | Knex security. |
| [`eslint-plugin-lambda-security`](https://www.npmjs.com/package/eslint-plugin-lambda-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-lambda-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-lambda-security) | AWS Lambda hardening. |
| [`eslint-plugin-mcp-sdk-security`](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mcp-sdk-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mcp-sdk-security) | MCP SDK security. |
| [`eslint-plugin-mongodb-security`](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mongodb-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mongodb-security) | MongoDB injection. |
| [`eslint-plugin-mysql-security`](https://www.npmjs.com/package/eslint-plugin-mysql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-mysql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-mysql-security) | MySQL security. |
| [`eslint-plugin-nestjs-security`](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-nestjs-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-nestjs-security) | NestJS framework hardening. |
| [`eslint-plugin-node-security`](https://www.npmjs.com/package/eslint-plugin-node-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-node-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-node-security) | Server-side patterns. |
| [`eslint-plugin-openai-security`](https://www.npmjs.com/package/eslint-plugin-openai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-openai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-openai-security) | OpenAI SDK security. |
| [`eslint-plugin-postgresql-security`](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-postgresql-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-postgresql-security) | PostgreSQL security. |
| [`eslint-plugin-prisma-security`](https://www.npmjs.com/package/eslint-plugin-prisma-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-prisma-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-prisma-security) | Prisma security. |
| [`eslint-plugin-secure-coding`](https://www.npmjs.com/package/eslint-plugin-secure-coding) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-secure-coding.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-secure-coding) | Injection prevention. |
| [`eslint-plugin-sequelize-security`](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sequelize-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sequelize-security) | Sequelize ORM security. |
| [`eslint-plugin-sqlite-security`](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-sqlite-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-sqlite-security) | SQLite security. |
| [`eslint-plugin-typeorm-security`](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-typeorm-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-typeorm-security) | TypeORM security. |
| [`eslint-plugin-vercel-ai-security`](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-vercel-ai-security.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-vercel-ai-security) | AI SDK security. |

**Code quality**

| Plugin | Downloads | Description |
| :--- | :---: | :--- |
| [`eslint-plugin-conventions`](https://www.npmjs.com/package/eslint-plugin-conventions) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-conventions.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-conventions) | Team-specific habits and styles. |
| [`eslint-plugin-import-next`](https://www.npmjs.com/package/eslint-plugin-import-next) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-import-next.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-import-next) | Fast cycle + import-graph analysis. |
| [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-maintainability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-maintainability) | Cognitive load and clean-code patterns. |
| [`eslint-plugin-modernization`](https://www.npmjs.com/package/eslint-plugin-modernization) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modernization.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modernization) | ESNext migration + syntax evolution. |
| [`eslint-plugin-modularity`](https://www.npmjs.com/package/eslint-plugin-modularity) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-modularity.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-modularity) | Structural integrity and DDD patterns. |
| [`eslint-plugin-operability`](https://www.npmjs.com/package/eslint-plugin-operability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-operability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-operability) | Production readiness and resource health. |
| [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-a11y.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-a11y) | React accessibility / WCAG. |
| [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-react-features.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-react-features) | React best practices and optimization. |
| [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability) | [![downloads](https://img.shields.io/npm/dt/eslint-plugin-reliability.svg?style=flat-square)](https://www.npmjs.com/package/eslint-plugin-reliability) | Runtime stability and error safety. |

<!-- AUTO-GENERATED:ECOSYSTEM_TABLE:END -->

## Related Packages

- **[@typescript-eslint/utils](https://www.npmjs.com/package/@typescript-eslint/utils)** - Official TypeScript ESLint utilities
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** - Import/export validation

---

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

---

## Contributing

Contributions welcome! See CONTRIBUTING.md (planned).

---

<!-- INTERLACE:STAR_CTA:START -->
## ⭐ Support & follow

If the devkit saved you time, **[star the repo](https://github.com/ofri-peretz/eslint)** — stars are the signal that keeps the Interlace ESLint ecosystem maintained — and **[follow the writeups on Dev.to](https://dev.to/ofri-peretz)** for the benchmarks and engineering behind these tools.

[![GitHub stars](https://img.shields.io/github/stars/ofri-peretz/eslint?style=social)](https://github.com/ofri-peretz/eslint)

<!-- INTERLACE:STAR_CTA:END -->

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a list of changes and version history.

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-devkit"><img src="https://eslint.interlace.tools/images/og-devkit.png" alt="ESLint Interlace" width="100%" /></a>
  <a href="https://scorecard.dev/viewer/?uri=github.com/ofri-peretz/eslint" target="_blank"><img src="https://api.securityscorecards.dev/projects/github.com/ofri-peretz/eslint/badge" alt="OpenSSF Scorecard" /></a>
</p>

<p align="center">
  <a href="https://eslint.interlace.tools/?utm_source=github&utm_medium=referral&utm_campaign=eslint-devkit" target="blank"><picture><source media="(prefers-color-scheme: dark)" srcset="https://eslint.interlace.tools/logos/interlace-dark.svg"><img src="https://eslint.interlace.tools/logos/interlace-light.svg" alt="Interlace" height="70" /></picture></a>
</p>
