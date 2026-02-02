---
title: no-multi-comp
description: no-multi-comp rule
tags: ['quality', 'react']
category: quality
autofix: suggestions
---


<!-- @rule-summary -->
no-multi-comp rule
<!-- @/rule-summary -->

# no-multi-comp

> **Keywords:** React, components, file organization, single responsibility, code structure, ESLint rule, LLM-optimized

Prevent multiple component definitions per file. This rule is part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).

## Quick Summary

| Aspect         | Details                                                              |
| -------------- | -------------------------------------------------------------------- |
| **Severity**   | Warning (organization)                                               |
| **Auto-Fix**   | ❌ No (requires file extraction)                                     |
| **Category**   | React                                                                |
| **ESLint MCP** | ✅ Optimized for ESLint MCP integration                              |
| **Best For**   | React projects with strict organization                              |

## Rule Details

Each React component should be in its own file for better maintainability, testing, and code organization. This follows the single responsibility principle.

### Why This Matters

| Issue                         | Impact                              | Solution                     |
| ----------------------------- | ----------------------------------- | ---------------------------- |
| 🔄 **Hard to find**           | Components hidden in large files    | One component per file       |
| 🐛 **Testing difficulty**     | Hard to isolate tests               | Separate files enable mocks  |
| 🔍 **Merge conflicts**        | Multiple devs editing same file     | Separate ownership           |

## Examples

### ❌ Incorrect

```tsx
// UserComponents.tsx - BAD: Multiple components in one file
function UserAvatar({ src, alt }) {
  return <img src={src} alt={alt} className="avatar" />;
}

function UserName({ name }) {
  return <span className="username">{name}</span>;
}

function UserCard({ user }) {
  return (
    <div className="user-card">
      <UserAvatar src={user.avatar} alt={user.name} />
      <UserName name={user.name} />
    </div>
  );
}

export default UserCard;
```

### ✅ Correct

```tsx
// UserAvatar.tsx
export function UserAvatar({ src, alt }) {
  return <img src={src} alt={alt} className="avatar" />;
}

// UserName.tsx
export function UserName({ name }) {
  return <span className="username">{name}</span>;
}

// UserCard.tsx
import { UserAvatar } from './UserAvatar';
import { UserName } from './UserName';

export function UserCard({ user }) {
  return (
    <div className="user-card">
      <UserAvatar src={user.avatar} alt={user.name} />
      <UserName name={user.name} />
    </div>
  );
}
```

## Options

| Option            | Type    | Default | Description                                |
| ----------------- | ------- | ------- | ------------------------------------------ |
| `ignoreStateless` | boolean | `false` | Allow multiple stateless functional components |

### Configuration with Options

```javascript
{
  rules: {
    'react-features/no-multi-comp': ['warn', {
      ignoreStateless: true  // Allow small helper components
    }]
  }
}
```

## Configuration Examples

### Basic Usage

```javascript
{
  rules: {
    'react-features/no-multi-comp': 'warn'
  }
}
```

### Strict Usage

```javascript
{
  rules: {
    'react-features/no-multi-comp': 'error'
  }
}
```

## Related Rules

- [`no-anonymous-default-export`](./no-anonymous-default-export.md) - Named exports
- [`filename-case`](./filename-case.md) - File naming conventions

## Further Reading

- **[Thinking in React](https://react.dev/learn/thinking-in-react)** - Component organization
- **[Single Responsibility](https://en.wikipedia.org/wiki/Single-responsibility_principle)** - Design principle
## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Dynamic Variable References

**Why**: Static analysis cannot trace values stored in variables or passed through function parameters.

```typescript
// ❌ NOT DETECTED - Prop from variable
const propValue = computedValue;
<Component prop={propValue} /> // Computation not analyzed
```

**Mitigation**: Implement runtime validation and review code manually. Consider using TypeScript branded types for validated inputs.

### Wrapped or Aliased Functions

**Why**: Custom wrapper functions or aliased methods are not recognized by the rule.

```typescript
// ❌ NOT DETECTED - Custom wrapper
function myWrapper(data) {
  return internalApi(data); // Wrapper not analyzed
}
myWrapper(unsafeInput);
```

**Mitigation**: Apply this rule's principles to wrapper function implementations. Avoid aliasing security-sensitive functions.

### Imported Values

**Why**: When values come from imports, the rule cannot analyze their origin or construction.

```typescript
// ❌ NOT DETECTED - Value from import
import { getValue } from './helpers';
processValue(getValue()); // Cross-file not tracked
```

**Mitigation**: Ensure imported values follow the same constraints. Use TypeScript for type safety.