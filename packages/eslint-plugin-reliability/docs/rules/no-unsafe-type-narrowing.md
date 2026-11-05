---
title: no-unsafe-type-narrowing
description: "Report double type assertions through unknown or any that bypass the type checker."
tags: ['quality', 'reliability']
category: quality
autofix: suggestions
---

> **Keywords:** no unsafe type narrowing, double assertion, as unknown as, type assertion, TypeScript, ESLint rule, SonarQube RSPEC-4326

<!-- @rule-summary -->
Report a double type assertion through `unknown` or `any` (`x as unknown as T`). It silences the checker exactly where it would have refused the conversion, and narrows a value nothing has checked.
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-reliability`](https://www.npmjs.com/package/eslint-plugin-reliability).

## Quick Summary

| Aspect          | Details                                      |
| --------------- | -------------------------------------------- |
| **Severity**    | Error (code quality)                         |
| **Auto-Fix**    | ❌ No                                        |
| **Category**    | Quality                                      |
| **Suggestions** | ✅ Use a type guard or validate first        |

## Rule Details

The rule reports an assertion whose operand was itself asserted to `unknown` or
`any`, in every spelling TypeScript has for it:

| Spelling            | Example                     |
| ------------------- | --------------------------- |
| `as` twice          | `raw as unknown as User`    |
| through `any`       | `raw as any as User`        |
| angle brackets      | `<User>(<unknown>raw)`      |
| mixed, `<T>` outer  | `<User>(raw as unknown)`    |
| mixed, `as` outer   | `(<unknown>raw) as User`    |

A single assertion (`raw as User`, `<User>raw`), a widening to `unknown`,
`as const` and `satisfies` are the checker's own business and are not reported.

## Configuration

| Option             | Type      | Default | Description                                                                               |
| ------------------ | --------- | ------- | ----------------------------------------------------------------------------------------- |
| `allowWithComment` | `boolean` | `false` | Accept a double assertion with an explanatory comment on the line above or the same line  |
| `ignoreInTests`    | `boolean` | `true`  | Skip `*.test.*` / `*.spec.*` files                                                        |

With `allowWithComment`, the comment must say why the assertion is sound
(`validated`, `checked`, `type guard`, `safe`, `known`, `intentional`, …). A
comment trailing the PREVIOUS statement speaks for that statement, not this one.

## Examples

### ❌ Incorrect

```typescript
const user = raw as unknown as User;
const user = <User>(<unknown>raw);
```

### ✅ Correct

```typescript
function isUser(value: unknown): value is User {
  return typeof value === 'object' && value !== null && 'id' in value;
}
if (isUser(raw)) use(raw);

const user = raw as User; // the checker still verifies this conversion

// With { allowWithComment: true }
// validated by the schema above
const user = raw as unknown as User;
```

## Related Rules

- [`no-missing-null-checks`](./no-missing-null-checks.md) - Dereferences of possibly-null values

## Known False Negatives

The following patterns are **not detected** due to static analysis limitations:

### Values the file cannot see

**Why**: a value that comes from another module, a parameter or an unresolved
call carries no evidence in this file, and a rule that decides from structure
stays silent rather than guess.

```typescript
// ❌ NOT DETECTED - origin in another module
import { getValue } from './helpers';
processValue(getValue());
```

**Mitigation**: apply the same contract inside the helper, where the evidence
is visible.
