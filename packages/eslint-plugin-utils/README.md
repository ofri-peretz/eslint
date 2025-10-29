# @forge-js/eslint-plugin-utils

**Build ESLint plugins that write themselves** - TypeScript utilities for creating rules that AI assistants can understand and auto-fix.

[![npm version](https://img.shields.io/npm/v/@forge-js/eslint-plugin-utils.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)
[![npm downloads](https://img.shields.io/npm/dm/@forge-js/eslint-plugin-utils.svg)](https://www.npmjs.com/package/@forge-js/eslint-plugin-utils)

## What is this?

Most ESLint utilities help you **write rules**. This package helps you write rules that **LLMs can fix automatically**.

Inspired by [@typescript-eslint/utils](https://typescript-eslint.io/packages/utils/), enhanced for the AI-assisted development era.

## Installation

```bash
npm install --save-dev @forge-js/eslint-plugin-utils
# or
pnpm add -D @forge-js/eslint-plugin-utils
# or
yarn add -D @forge-js/eslint-plugin-utils
```

**Peer dependencies:**

```bash
npm install --save-dev @typescript-eslint/parser typescript
```

## Quick Example

```typescript
import { createRule, isMemberExpression } from '@forge-js/eslint-plugin-utils';

export default createRule({
  name: 'no-console-log',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.log - use logger.debug() instead',
    },
    fixable: 'code',
    messages: {
      useLogger:
        'Replace console.log with logger.{{method}}() on line {{line}}',
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
            data: {
              method: 'debug',
              line: node.loc.start.line,
            },
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

When GitHub Copilot or Cursor sees this error, they know exactly:

- What's wrong: `console.log` on line 42
- How to fix: Replace with `logger.debug()`
- Auto-fix available: Yes

## API

### Rule Creation

#### `createRule(options)`

Creates a well-typed ESLint rule with automatic documentation links.

```typescript
import { createRule } from '@forge-js/eslint-plugin-utils';

const rule = createRule({
  name: 'my-rule',
  meta: {
    /* ... */
  },
  defaultOptions: [],
  create(context) {
    // Your rule implementation
    return {
      /* visitors */
    };
  },
});
```

#### `createRuleCreator(urlCreator)`

Creates a custom rule factory with your documentation URL pattern.

```typescript
import { createRuleCreator } from '@forge-js/eslint-plugin-utils';

const createRule = createRuleCreator(
  (ruleName) => `https://your-plugin.dev/rules/${ruleName}`
);

export default createRule({
  /* ... */
});
```

### AST Utilities

Helper functions for traversing and analyzing ESTree/TSESTree nodes:

| Function                                     | Description                        | Example                                      |
| -------------------------------------------- | ---------------------------------- | -------------------------------------------- |
| `isNodeOfType(node, type)`                   | Type guard for AST nodes           | `isNodeOfType(node, 'Identifier')`           |
| `isFunctionNode(node)`                       | Check if node is any function type | `isFunctionNode(node)`                       |
| `isClassNode(node)`                          | Check if node is a class           | `isClassNode(node)`                          |
| `isMemberExpression(node, object, property)` | Match patterns like `console.log`  | `isMemberExpression(node, 'console', 'log')` |
| `isCallExpression(node, name)`               | Check function call by name        | `isCallExpression(node, 'fetch')`            |
| `getIdentifierName(node)`                    | Extract identifier name            | `getIdentifierName(node) // 'myVar'`         |
| `getFunctionName(node)`                      | Get function name                  | `getFunctionName(node) // 'myFunc'`          |
| `isInsideNode(node, parentType, ancestors)`  | Check if inside specific parent    | `isInsideNode(node, 'TryStatement')`         |
| `getAncestorOfType(type, ancestors)`         | Find first ancestor of type        | `getAncestorOfType('FunctionDeclaration')`   |
| `isLiteral(node)`                            | Check if literal value             | `isLiteral(node)`                            |
| `isTemplateLiteral(node)`                    | Check if template literal          | `isTemplateLiteral(node)`                    |
| `getStaticValue(node)`                       | Extract static value               | `getStaticValue(node) // 'hello'`            |

**Example:**

```typescript
import {
  isMemberExpression,
  isInsideNode,
  getAncestorOfType,
} from '@forge-js/eslint-plugin-utils';

create(context) {
  return {
    CallExpression(node) {
      // Detect console.log() calls
      if (isMemberExpression(node.callee, 'console', 'log')) {
        // Check if inside try-catch (might be intentional logging)
        const insideTry = isInsideNode(
          node,
          'TryStatement',
          context.getAncestors()
        );

        if (!insideTry) {
          context.report({
            node,
            message: 'Avoid console.log outside error handlers',
          });
        }
      }
    },
  };
}
```

### Type Utilities

Type-aware analysis using TypeScript compiler API:

| Function                          | Description                                 | Example                                       |
| --------------------------------- | ------------------------------------------- | --------------------------------------------- |
| `hasParserServices(context)`      | Check if type info available                | `if (hasParserServices(context))`             |
| `getParserServices(context)`      | Get parser services (throws if unavailable) | `const services = getParserServices(context)` |
| `getTypeOfNode(node, services)`   | Get TypeScript type of node                 | `const type = getTypeOfNode(node, services)`  |
| `isStringType(type)`              | Check if type is string                     | `isStringType(type)`                          |
| `isNumberType(type)`              | Check if type is number                     | `isNumberType(type)`                          |
| `isBooleanType(type)`             | Check if type is boolean                    | `isBooleanType(type)`                         |
| `isArrayType(type, checker)`      | Check if type is array                      | `isArrayType(type, checker)`                  |
| `isPromiseType(type, checker)`    | Check if type is Promise                    | `isPromiseType(type, checker)`                |
| `isAnyType(type)`                 | Check if type is any                        | `isAnyType(type)`                             |
| `isUnknownType(type)`             | Check if type is unknown                    | `isUnknownType(type)`                         |
| `isNullableType(type)`            | Check if type is nullable                   | `isNullableType(type)`                        |
| `getTypeArguments(type, checker)` | Get generic type arguments                  | `getTypeArguments(type, checker)`             |

**Example:**

```typescript
import {
  hasParserServices,
  getParserServices,
  getTypeOfNode,
  isPromiseType,
} from '@forge-js/eslint-plugin-utils';

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
        const isAwaited = parent.type === 'AwaitExpression';

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

## Why LLM-Optimized Matters

### Traditional ESLint Rule

```typescript
// Error output
{
  message: "Unexpected console statement",
  line: 42
}

// AI Assistant thinks: "Remove it? Comment it? Replace with what?"
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
// ✅ Auto-applies fix
```

## Best Practices

### 1. Provide Specific Error Messages

```typescript
// ❌ Vague
message: 'Invalid usage';

// ✅ Specific
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
    // Type-aware detection
  }
}
```

## TypeScript

Full TypeScript support with comprehensive type definitions:

```typescript
import type { TSESTree } from '@typescript-eslint/utils';
import {
  createRule,
  isMemberExpression,
  type RuleContext,
} from '@forge-js/eslint-plugin-utils';

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

## Compatibility

| Package                   | Version            |
| ------------------------- | ------------------ |
| ESLint                    | ^8.0.0 \|\| ^9.0.0 |
| TypeScript                | >=4.0.0            |
| @typescript-eslint/parser | >=6.0.0            |
| @typescript-eslint/utils  | ^8.0.0             |
| Node.js                   | >=18.0.0           |

## Related Packages

- **[@forge-js/eslint-plugin-llm-optimized](https://www.npmjs.com/package/@forge-js/eslint-plugin-llm-optimized)** - Ready-to-use LLM-optimized rules built with this package
- **[@typescript-eslint/utils](https://www.npmjs.com/package/@typescript-eslint/utils)** - Official TypeScript ESLint utilities
- **[eslint-plugin-import](https://www.npmjs.com/package/eslint-plugin-import)** - Import/export validation

## License

MIT © [Ofri Peretz](https://github.com/ofri-peretz)

## Contributing

Contributions welcome! See [CONTRIBUTING.md](https://github.com/ofri-peretz/forge-js/blob/main/CONTRIBUTING.md).
