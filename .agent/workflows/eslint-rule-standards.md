---
description: Standards for developing ESLint security rules in the Forge-JS ecosystem
---

# ESLint Rule Development Standards

This workflow codifies the engineering standards for developing and maintaining ESLint rules across all security plugins in the Forge-JS ecosystem.

## AST Node Types

**CRITICAL**: Always use `AST_NODE_TYPES` constants instead of literal strings for type checks.

### ✅ Correct

```typescript
import { AST_NODE_TYPES, createRule, formatLLMMessage, MessageIcons } from '@interlace/eslint-devkit';

// Use AST_NODE_TYPES constants
if (node.type === AST_NODE_TYPES.Identifier) { ... }
if (dec.expression.type === AST_NODE_TYPES.CallExpression) { ... }
if (param.type === AST_NODE_TYPES.TSStringKeyword) { ... }
```

### ❌ Incorrect

```typescript
// Never use literal strings for AST types
if (node.type === 'Identifier') { ... }  // BAD
if (dec.expression.type === 'CallExpression') { ... }  // BAD
```

### Rationale

1. **Type Safety**: TypeScript will catch typos and invalid node types at compile time
2. **Maintainability**: Central constant definitions make updates easier
3. **IDE Support**: Better autocomplete and refactoring support
4. **Consistency**: Uniform codebase across all plugins

---

## Rule Structure Template

```typescript
/**
 * ESLint Rule: rule-name
 * Brief description
 * CWE-XXX: CWE Title
 *
 * @see https://cwe.mitre.org/data/definitions/XXX.html
 * @see https://relevant-docs-link
 */
import type { TSESLint, TSESTree } from '@interlace/eslint-devkit';
import {
  AST_NODE_TYPES,
  createRule,
  formatLLMMessage,
  MessageIcons,
} from '@interlace/eslint-devkit';

type MessageIds = 'primaryError' | 'suggestionFix';

export interface Options {
  /** Allow in test files. Default: true */
  allowInTests?: boolean;
}

type RuleOptions = [Options?];

export const ruleName = createRule<RuleOptions, MessageIds>({
  name: 'rule-name',
  meta: {
    type: 'problem', // or 'suggestion'
    docs: {
      description: 'Brief description of what this rule does',
    },
    hasSuggestions: true,
    messages: {
      primaryError: formatLLMMessage({
        icon: MessageIcons.SECURITY,
        issueName: 'Issue Name',
        cwe: 'CWE-XXX',
        owasp: 'A0X',
        cvss: 7.5,
        description: 'Description with {{placeholders}}',
        severity: 'HIGH',
        fix: 'How to fix this issue',
        documentationLink: 'https://docs-link',
      }),
      suggestionFix: formatLLMMessage({
        icon: MessageIcons.INFO,
        issueName: 'Suggestion Name',
        description: 'Suggestion description',
        severity: 'LOW',
        fix: 'Specific fix instruction',
        documentationLink: 'https://docs-link',
      }),
    },
    schema: [
      {
        type: 'object',
        properties: {
          allowInTests: { type: 'boolean', default: true },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{ allowInTests: true }],
  create(
    context: TSESLint.RuleContext<MessageIds, RuleOptions>,
    [options = {}],
  ) {
    const { allowInTests = true } = options as Options;
    const filename = context.filename || context.getFilename();
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filename);

    if (allowInTests && isTestFile) {
      return {};
    }

    return {
      // AST visitors here
    };
  },
});
```

---

## Message Formatting

Always use `formatLLMMessage` for structured, LLM-optimized error messages:

```typescript
formatLLMMessage({
  icon: MessageIcons.SECURITY, // 🔒 for security issues
  issueName: 'Human-readable name',
  cwe: 'CWE-XXX', // Always include CWE reference
  owasp: 'A0X', // OWASP Top 10 category (optional)
  cvss: 7.5, // CVSS score (optional)
  description: 'Clear description',
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW',
  fix: 'Actionable fix instruction',
  documentationLink: 'https://link',
});
```

---

## Test Structure

```typescript
import { RuleTester } from '@typescript-eslint/rule-tester';
import { ruleName } from './index';

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
});

ruleTester.run('rule-name', ruleName, {
  valid: [
    // Group by category with comments
    // Correct usage
    { code: `...` },
    // Edge cases that should pass
    { code: `...` },
  ],
  invalid: [
    // Clear violation
    { code: `...`, errors: [{ messageId: 'primaryError' }] },
    // Multiple violations
    {
      code: `...`,
      errors: [{ messageId: 'primaryError' }, { messageId: 'primaryError' }],
    },
  ],
});
```

---

## File Structure

```
src/rules/
  rule-name/
    index.ts       # Rule implementation
    index.spec.ts  # Tests
```

---

## Pre-Commit Checklist

Before committing a new or modified rule:

- [ ] Uses `AST_NODE_TYPES` constants (no string literals for node types)
- [ ] Uses `formatLLMMessage` for all error messages
- [ ] Includes CWE reference
- [ ] Includes comprehensive tests (valid + invalid cases)
- [ ] Exports rule from plugin index
- [ ] Added to appropriate config presets (recommended/strict)
- [ ] Passes lint check: `pnpm nx lint <plugin-name>`
- [ ] Passes tests: `pnpm nx test <plugin-name>`

---

## Related

- Template reference: `eslint-devkit/src/index.ts`
- Example plugin: `eslint-plugin-lambda-security`
