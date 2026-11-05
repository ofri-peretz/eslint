---
title: max-parameters
description: "Report functions that take more parameters than a caller can pass correctly."
tags: ['quality', 'maintainability']
category: quality
autofix: suggestions
---

> **Keywords:** max parameters, max params, long parameter list, ESLint rule, JavaScript, TypeScript, SonarQube RSPEC-107

<!-- @rule-summary -->
Report a function that takes more than `max` parameters. A long positional parameter list is easy to call with arguments in the wrong order.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-maintainability`](https://www.npmjs.com/package/eslint-plugin-maintainability).

## Quick Summary

| Aspect          | Details                                              |
| --------------- | ---------------------------------------------------- |
| **Severity**    | Error (code quality)                                 |
| **Auto-Fix**    | ❌ No                                                |
| **Category**    | Quality                                              |
| **Suggestions** | 💡 Use an object parameter, extract a class, split   |

## Rule Details

The rule counts the parameters a caller passes and reports a function with more
than `max` (default 4). Every function form is checked: a declaration, a
function expression, an arrow, a class method, a constructor, and an
arrow-function class property.

- A rest parameter (`...rest`) is one parameter.
- A destructured parameter (`{ a, b }`) is one parameter.
- TypeScript's `this` parameter is not counted: it is erased before emit and no
  caller passes it (as in `@typescript-eslint/max-params`).
- A file whose leading comment declares it generated (`@generated`) is skipped:
  a generated signature's arity is the generator's decision.

## Configuration

| Option                    | Type      | Default | Description                                                                 |
| ------------------------- | --------- | ------- | --------------------------------------------------------------------------- |
| `max`                     | `number`  | `4`     | Most parameters a function may take                                         |
| `ignoreConstructors`      | `boolean` | `false` | Skip class constructors (their arity often comes from dependency injection) |
| `ignoreOverriddenMethods` | `boolean` | `false` | Skip methods and arrow properties marked `override` (the base class decides the signature) |

With `ignoreConstructors`, a function declaration whose name starts with an
uppercase letter (an ES5 constructor function) is skipped as well.

## Examples

### ❌ Incorrect

```typescript
function createUser(name: string, email: string, age: number, role: Role, team: Team) {}

class Cart {
  total = (a: number, b: number, c: number, d: number, e: number) => a + b + c + d + e;
}
```

### ✅ Correct

```typescript
function createUser({ name, email, age, role, team }: NewUser) {}

// `this` is not a parameter a caller passes
function onClick(this: HTMLElement, a: number, b: number, c: number, d: number) {}

// With { ignoreOverriddenMethods: true }
class Admin extends User {
  override update(a: string, b: string, c: string, d: string, e: string) {}
}
```

## Configuration Examples

```javascript
// eslint.config.mjs
export default [
  {
    rules: {
      'maintainability/max-parameters': ['error', { max: 5, ignoreConstructors: true }],
    },
  },
];
```

## Related Rules

- [`cognitive-complexity`](./cognitive-complexity.md) - Function complexity limits

## Further Reading

- **[SonarQube RSPEC-107](https://rules.sonarsource.com/javascript/RSPEC-107/)** - Functions should not have too many parameters
- **[Introduce Parameter Object](https://refactoring.guru/introduce-parameter-object)** - The refactoring this rule suggests

## Known False Negatives

### Overload and declaration signatures

**Why**: the rule checks function implementations. A `declare function`
signature, an overload signature or a function type has no body to refactor.

```typescript
// ❌ NOT DETECTED
declare function legacy(a: number, b: number, c: number, d: number, e: number): void;
```
