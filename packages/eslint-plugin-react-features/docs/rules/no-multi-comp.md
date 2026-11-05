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
// UserCard.tsx — one component; helpers that are not components are fine
function renderBadge(role: string) {
  return <span className="badge">{role}</span>;
}

export default function UserCard({ user }) {
  return (
    <div className="user-card">
      {user.name} {renderBadge(user.role)}
    </div>
  );
}
```

A component, as React defines one: a class that extends React's `Component` / `PureComponent`, a function whose name starts with a capital letter and that returns JSX, or a function passed to React's `memo` / `forwardRef`. A lowercase render helper or a PascalCase function that returns no JSX is not a component. Every component after the first is reported; with `ignoreStateless: true`, only class components count.

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

- **Components made by other higher-order functions**: `styled.div`, `connect(...)(View)` or a custom `withX(() => <div />)` are not counted; only `memo` / `forwardRef` (by binding), PascalCase functions that return JSX, and classes that extend React's `Component` / `PureComponent` are.
- **A component that returns JSX only through a helper call** (`function Card() { return renderCard(); }`) is not recognised.
