---
title: component-api/require-data-slot
description: Named composition parts must carry data-slot for styling and queryability
tags: ['component-api', 'composition', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R6 from the `interlace-component` skill: every named composition part
carries `data-slot="<part-name>"` so consumers can style by slot and tests can
target it without inheriting the token chain.
<!-- @/rule-summary -->

# component-api/require-data-slot

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R6** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                |
| ------------ | ------------------------------------------------------ |
| **Severity** | Warning                                                |
| **Auto-Fix** | ❌ No (slot-name is meaningful, must be chosen)         |
| **Category** | component-api                                          |
| **Skill ID** | R6                                                     |

## Rule Details

The heuristic: any JSX element that carries `data-testid` is a *named part* of
the component and must also carry `data-slot`. `data-slot` lets consumers
target the part with CSS or with composition adapters without learning the
internal class structure — it's the public CSS selector contract.

## Examples

### ❌ Incorrect

```tsx
<div data-testid="card-header" className="…" />
```

### ✅ Correct

```tsx
<div data-slot="card-header" data-testid="card-header" className="…" />
```

## Known False Negatives

The heuristic only catches elements that also have `data-testid`. A primitive
that ships no testids will not be flagged for missing `data-slot`. In practice,
R5 + R6 are paired — `data-testid` already exists everywhere this rule should fire.

## Related

- **R5** (`component-api/no-default-test-id`) — the partner rule that makes `data-testid` required at the consumer level.
