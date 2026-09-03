# AGENTS.md

> Context for AI coding agents working on @interlace/eslint-devkit

## Setup Commands

```bash
# Install dependencies (from monorepo root)
npm install

# Build this package
nx build eslint-devkit

# Run tests
nx test eslint-devkit

# Run tests with coverage
nx test eslint-devkit --coverage

# Lint this package
nx lint eslint-devkit
```

## Code Style

- TypeScript strict mode
- Export all public utilities from `src/index.ts`
- Use TSDoc comments for all public APIs
- Use `c8 ignore` comments with documented reasons for untestable code
- Tree-shakeable exports (no side effects)

## Testing Instructions

- Tests use Vitest
- Test files are in `__tests__/` directories or `*.test.ts` files
- Coverage target: ≥90% lines, ≥95% functions
- All tests must pass before committing

## Project Structure

```
src/
├── index.ts              # Main exports
├── rule-creator/         # createRule, createRuleCreator
├── ast-utils/            # AST analysis utilities
├── type-utils/           # TypeScript type utilities
├── message-utils/        # formatLLMMessage and icons
└── types/                # Type definitions
```

## Package Purpose

Utilities for building **LLM-optimized ESLint rules**. This is the foundation package used by all security plugins in the monorepo. It provides standardized rule creation, AST utilities, type checking helpers, and message formatting.

## Core Exports

### Rule Creation

```typescript
import { createRule, createRuleCreator } from '@interlace/eslint-devkit';
```

### AST Utilities

```typescript
import {
  isNodeOfType,
  isFunctionNode,
  isMemberExpression,
  isCallExpression,
  getIdentifierName,
  getFunctionName,
  getStaticValue,
  isInsideNode,
  getAncestorOfType,
} from '@interlace/eslint-devkit';
```

### Type Utilities

```typescript
import {
  hasParserServices,
  getParserServices,
  getTypeOfNode,
  isStringType,
  isNumberType,
  isPromiseType,
  isArrayType,
} from '@interlace/eslint-devkit';
```

### Message Formatting

```typescript
import { formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';
```

### Type Re-exports

```typescript
import { TSESLint, TSESTree, AST_NODE_TYPES } from '@interlace/eslint-devkit';
```

## Creating a New Rule

```typescript
import {
  createRule,
  formatLLMMessage,
  MessageIcons,
  AST_NODE_TYPES,
} from '@interlace/eslint-devkit';

export const myRule = createRule({
  name: 'my-rule',
  meta: {
    type: 'problem',
    docs: { description: 'My rule description' },
    hasSuggestions: true,
    messages: {
      error: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Security Issue',
        cwe: 'CWE-XXX',
        description: 'Description of the issue',
        severity: 'HIGH',
        fix: 'How to fix it',
        documentationLink: 'https://...',
      }),
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // Rule implementation
      },
    };
  },
});
```

## Best Practices

1. **Use AST_NODE_TYPES**: Always use `AST_NODE_TYPES.Identifier` instead of string `'Identifier'`
2. **Use formatLLMMessage**: All security messages should use the structured format
3. **Check parser services**: Always check `hasParserServices()` before using type utilities
4. **Single-pass traversal**: Rules should visit nodes once (O(n) complexity)
5. **Export rule options types**: Export the Options interface for TypeScript users
