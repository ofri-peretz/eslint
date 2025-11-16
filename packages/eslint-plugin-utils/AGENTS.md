# @forge-js/eslint-plugin-utils - AI Agent Guide

## Package Overview

**Name:** @forge-js/eslint-plugin-utils  
**Version:** 1.4.0  
**Description:** Utilities for building LLM-optimized ESLint rules. TypeScript utilities for creating rules that AI assistants can understand and auto-fix. Most ESLint utilities help you write rules. This package helps you write rules that LLMs can fix automatically.

**Keywords:** eslint, eslint-plugin, typescript, utilities, ast, type-checking, plugin-development, llm-optimized, ai-assistant, auto-fix, github-copilot, cursor-ai, claude-ai, structured-error-messages, deterministic-fixes

**Homepage:** https://github.com/ofri-peretz/forge-js#readme  
**Repository:** https://github.com/ofri-peretz/forge-js.git  
**Directory:** packages/eslint-plugin-utils

## Installation

```bash
npm install --save-dev @forge-js/eslint-plugin-utils
# or
pnpm add -D @forge-js/eslint-plugin-utils
# or
yarn add -D @forge-js/eslint-plugin-utils
```

**Peer Dependencies (required):**
```bash
npm install --save-dev @typescript-eslint/parser typescript
npm install --save-dev @typescript-eslint/utils
```

## Quick Start

### Create Your First Rule

```typescript
import { createRule, isMemberExpression } from '@forge-js/eslint-plugin-utils';

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
import { createRule } from '@forge-js/eslint-plugin-utils';

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
import { createRuleCreator } from '@forge-js/eslint-plugin-utils';

const createRule = createRuleCreator(
  (ruleName) => `https://your-plugin.dev/rules/${ruleName}`,
);

export default createRule({
  name: 'my-rule',
  // ...
});
```

### AST Utilities

#### Node Type Checks

| Function | Description | Example |
|----------|-------------|---------|
| `isNodeOfType(node, type)` | Type guard for AST nodes | `isNodeOfType(node, 'Identifier')` |
| `isFunctionNode(node)` | Check if node is any function type | `isFunctionNode(node)` |
| `isClassNode(node)` | Check if node is a class | `isClassNode(node)` |
| `isLiteral(node)` | Check if literal value | `isLiteral(node)` |
| `isTemplateLiteral(node)` | Check if template literal | `isTemplateLiteral(node)` |

#### Pattern Matching

| Function | Description | Example |
|----------|-------------|---------|
| `isMemberExpression(node, object, property)` | Match patterns like `console.log` | `isMemberExpression(node, 'console', 'log')` |
| `isCallExpression(node, name)` | Check function call by name | `isCallExpression(node, 'fetch')` |

#### Value Extraction

| Function | Description | Example |
|----------|-------------|---------|
| `getIdentifierName(node)` | Extract identifier name | `getIdentifierName(node) // 'myVar'` |
| `getFunctionName(node)` | Get function name | `getFunctionName(node) // 'myFunc'` |
| `getStaticValue(node)` | Extract static value | `getStaticValue(node) // 'hello'` |

#### Ancestor Navigation

| Function | Description | Example |
|----------|-------------|---------|
| `isInsideNode(node, parentType, ancestors)` | Check if inside specific parent | `isInsideNode(node, 'TryStatement', ancestors)` |
| `getAncestorOfType(type, ancestors)` | Find first ancestor of type | `getAncestorOfType('FunctionDeclaration', ancestors)` |

### Type Utilities

Type-aware analysis using TypeScript compiler API. These utilities require TypeScript parser services.

#### Service Access

| Function | Description | Example |
|----------|-------------|---------|
| `hasParserServices(context)` | Check if type info available | `if (hasParserServices(context))` |
| `getParserServices(context)` | Get parser services (throws if unavailable) | `const services = getParserServices(context)` |
| `getTypeOfNode(node, services)` | Get TypeScript type of node | `const type = getTypeOfNode(node, services)` |

#### Type Checks

| Function | Description | Example |
|----------|-------------|---------|
| `isStringType(type)` | Check if type is string | `isStringType(type)` |
| `isNumberType(type)` | Check if type is number | `isNumberType(type)` |
| `isBooleanType(type)` | Check if type is boolean | `isBooleanType(type)` |
| `isArrayType(type, checker)` | Check if type is array | `isArrayType(type, checker)` |
| `isPromiseType(type, checker)` | Check if type is Promise | `isPromiseType(type, checker)` |
| `isAnyType(type)` | Check if type is any | `isAnyType(type)` |
| `isUnknownType(type)` | Check if type is unknown | `isUnknownType(type)` |
| `isNullableType(type)` | Check if type is nullable | `isNullableType(type)` |
| `getTypeArguments(type, checker)` | Get generic type arguments | `getTypeArguments(type, checker)` |

### LLM Message Format

#### `formatLLMMessage(message, data)`

Formats error messages for optimal LLM consumption.

**Parameters:**
- `message` (string): Message template with placeholders
- `data` (object): Data to fill placeholders

**Returns:** Formatted message string

**Example:**
```typescript
import { formatLLMMessage } from '@forge-js/eslint-plugin-utils';

const message = formatLLMMessage(
  'Replace {{old}} with {{new}} on line {{line}}',
  { old: 'console.log', new: 'logger.debug', line: 42 }
);
// Returns: "Replace console.log with logger.debug on line 42"
```

## Complete Examples

### Example 1: Console.log Detection

```typescript
import {
  isMemberExpression,
  isInsideNode,
  getAncestorOfType,
  getIdentifierName,
} from '@forge-js/eslint-plugin-utils';

create(context) {
  return {
    CallExpression(node) {
      if (isMemberExpression(node.callee, 'console', 'log')) {
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

### Example 2: Type-Aware Promise Detection

```typescript
import {
  hasParserServices,
  getParserServices,
  getTypeOfNode,
  isPromiseType,
} from '@forge-js/eslint-plugin-utils';

create(context) {
  if (!hasParserServices(context)) {
    return {};
  }

  const services = getParserServices(context);
  const checker = services.program.getTypeChecker();

  return {
    CallExpression(node) {
      const type = getTypeOfNode(node, services);

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

## Best Practices

1. **Provide Specific Error Messages:** Include exact fix instructions
2. **Include Auto-Fixes When Possible:** Use fixer API for automatic corrections
3. **Structure Error Data for AI:** Use structured data objects with clear fields
4. **Use Type Information When Available:** Check for parser services before using type utilities
5. **Provide Context in Messages:** Include function names, line numbers, and suggestions

## FAQ

**Q: How do I create a new ESLint rule?**  
A: Use `createRule()` with name, meta, defaultOptions, and create function.

**Q: How do I check if a node is a specific type?**  
A: Use `isNodeOfType(node, 'TypeName')` or specific helpers like `isFunctionNode(node)`.

**Q: How do I match patterns like `console.log`?**  
A: Use `isMemberExpression(node, 'console', 'log')` to match member expressions.

**Q: How do I get TypeScript type information?**  
A: Check `hasParserServices(context)`, then use `getParserServices(context)` and `getTypeOfNode(node, services)`.

**Q: How do I navigate the AST tree?**  
A: Use `context.getAncestors()` and helper functions like `getAncestorOfType()` or `isInsideNode()`.

**Q: How do I extract values from nodes?**  
A: Use `getIdentifierName(node)`, `getFunctionName(node)`, or `getStaticValue(node)`.

**Q: How do I format messages for LLMs?**  
A: Use `formatLLMMessage()` with placeholders and data objects.

**Q: What's the difference between AST and type utilities?**  
A: AST utilities work on syntax, type utilities require TypeScript parser services and work on semantics.

**Q: How do I handle projects without TypeScript?**  
A: Always check `hasParserServices(context)` before using type utilities, return empty object if unavailable.

**Q: How do I report an error with auto-fix?**  
A: Use `context.report()` with a `fix` function that returns a fixer operation.

## Related Packages

- **@forge-js/eslint-plugin-llm-optimized:** Ready-to-use LLM-optimized rules built with this package
- **@typescript-eslint/utils:** Official TypeScript ESLint utilities

## License

MIT © Ofri Peretz

## Support

- **Documentation:** https://github.com/ofri-peretz/forge-js/blob/main/packages/eslint-plugin-utils/README.md
- **Issues:** https://github.com/ofri-peretz/forge-js/issues
- **Discussions:** https://github.com/ofri-peretz/forge-js/discussions

