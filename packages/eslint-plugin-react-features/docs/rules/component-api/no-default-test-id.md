---
title: component-api/no-default-test-id
description: data-testid must be consumer-provided — no runtime default value
tags: ['component-api', 'testing', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R5 from the `interlace-component` skill: a component's `data-testid`
must be required at the type level and provided by the consumer at the call site.
A runtime default value contradicts the type-level requirement and silently
masks consumer omissions.
<!-- @/rule-summary -->

# component-api/no-default-test-id

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R5** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                |
| ------------ | ------------------------------------------------------ |
| **Severity** | Error                                                  |
| **Auto-Fix** | ❌ No (refactor needed — also drop the default at type) |
| **Category** | component-api                                          |
| **Skill ID** | R5                                                     |

## Rule Details

Components in a shared package expose `data-testid` as a contract: the consumer
attaches a stable selector that survives refactors and powers e2e tests. If the
component ships a runtime default, the consumer can silently omit the prop and
the test selector becomes whatever the component author chose — coupling the
test layer to source-internal naming.

The type-level fix is to require `data-testid` on every component (e.g. via a
`RequiredTestId` mixin); the runtime fix this rule enforces is to **not** assign
a default value in the destructure.

## Examples

### ❌ Incorrect

```tsx
function Card({ "data-testid": dataTestId = "card", ...props }) {
  return <div data-testid={dataTestId} {...props} />;
}
```

### ✅ Correct

```tsx
function Card({ "data-testid": dataTestId, ...props }) {
  return <div data-testid={dataTestId} {...props} />;
}

// Type-level:
type Props = { "data-testid": string } & React.ComponentProps<"div">;
```

## Related

- **R6** (`component-api/require-data-slot`) — every named composition part also carries `data-slot`.
- **`required-attributes`** (existing rule) — enforces `data-testid` presence on JSX elements.
