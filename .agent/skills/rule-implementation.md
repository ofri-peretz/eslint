---
name: ESLint Rule Implementation
activation: When creating or modifying ESLint rules
---

# Rule Implementation Skill

## AST Node Types

Common ESTree node types for security rules:

| Node Type              | Use Case                                  |
| ---------------------- | ----------------------------------------- |
| `CallExpression`       | Function calls (e.g., `eval()`, `exec()`) |
| `MemberExpression`     | Property access (e.g., `req.body`)        |
| `Literal`              | Hardcoded values (strings, regexes)       |
| `TemplateExpression`   | Template literals with interpolation      |
| `AssignmentExpression` | Variable assignments                      |
| `BinaryExpression`     | Comparisons, arithmetic                   |
| `Identifier`           | Variable/function names                   |

## Selector Patterns

```typescript
// Direct function call
'CallExpression[callee.name="eval"]';

// Method call on object
'CallExpression[callee.type="MemberExpression"][callee.property.name="exec"]';

// Chained method call
'CallExpression[callee.object.callee.property.name="query"]';

// Attribute access
'MemberExpression[property.name="innerHTML"]';
```

## Common Rule Patterns

### Detecting Dangerous Functions

```typescript
CallExpression(node) {
  if (node.callee.type === 'Identifier' &&
      dangerousFunctions.has(node.callee.name)) {
    context.report({ node, messageId: 'dangerousCall' });
  }
}
```

### Detecting Missing Validation

```typescript
'CallExpression[callee.property.name="query"]'(node) {
  const hasValidation = checkForValidation(node);
  if (!hasValidation) {
    context.report({ node, messageId: 'unvalidatedInput' });
  }
}
```

### Tracking Data Flow

```typescript
create(context) {
  const taintedVars = new Set<string>();

  return {
    // Track tainted sources
    'AssignmentExpression[right.callee.object.name="req"]'(node) {
      taintedVars.add(getVariableName(node.left));
    },

    // Check sinks
    'CallExpression[callee.property.name="query"]'(node) {
      if (useTaintedVariable(node, taintedVars)) {
        context.report({ node, messageId: 'sqlInjection' });
      }
    }
  };
}
```

## Testing Patterns

### Valid Cases (should NOT trigger)

- Sanitized input
- Hardcoded safe values
- Proper validation present
- Framework-specific safe patterns

### Invalid Cases (should trigger)

- Direct user input usage
- Missing sanitization
- Obvious vulnerability patterns
