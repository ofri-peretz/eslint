---
title: component-api/no-is-prefix-prop
description: Boolean props default-false; name describes the true state (no `isXxx` prefix)
tags: ['component-api', 'naming', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R8 from the `interlace-component` skill: boolean props default-false and
the prop name describes the true state directly — `looped`, not `isLooped`.
Follows MUI's API naming guideline.
<!-- @/rule-summary -->

# component-api/no-is-prefix-prop

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R8** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                            |
| ------------ | ------------------------------------------------------------------ |
| **Severity** | Warning                                                            |
| **Auto-Fix** | ❌ No (rename has consumer-side blast radius — manual on purpose)   |
| **Category** | component-api                                                      |
| **Skill ID** | R8                                                                 |

## Rule Details

A boolean prop named `isLooped` reads as a query (*is it looped?*) but a prop
*describes* its true state — `looped` is the active state, and the default of
`false` is the absent state. Shorthand notation `<Foo looped>` then reads
naturally; `<Foo isLooped>` is noisy by comparison. MUI codifies this
([API guide](https://mui.com/material-ui/guides/api/)).

This rule flags TypeScript property signatures named `is[A-Z]…` (key written
as an identifier or quoted) whose type is `boolean`, or `boolean` widened with
`undefined` / `null` (`isLooped?: boolean | undefined`). Renaming a prop has consumer-side blast radius, so the fix is intentionally
manual — pair with a deprecation cycle when refactoring published APIs.

## Examples

### ❌ Incorrect

```ts
interface ButtonProps {
  isLooped: boolean;
  isDisabled: boolean;
}
```

### ✅ Correct

```ts
interface ButtonProps {
  looped: boolean;
  disabled: boolean;
}
```

## Known False Negatives

- Boolean *variables* (not props) are not flagged — this rule targets the API surface.
- A boolean named through a type alias (`isLooped: Flag`) is not followed.
- A props type reached through `forwardRef<...>`, `memo` or a props type named without a `Props` suffix is not read as props.

## Known False Positives

- None known for a data type: only a member of an interface or type alias whose name
  ends in `Props`, of an inline parameter type of a component (a PascalCase function,
  or one that returns JSX, first parameter), or of the type argument of `FC<...>` is
  read as a prop (`interface User { isAdmin: boolean }` is left alone).

## Related

- **R25** (deprecation pattern) — when renaming a published prop, add `@deprecated` + dev-mode warn.
