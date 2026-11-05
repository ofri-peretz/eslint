---
title: component-api/no-wrapper-sub-component
description: Ban pure-passthrough wrapper sub-components — slot the primitive directly
tags: ['component-api', 'composition', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R12 from the `interlace-component` skill: a function component whose
entire body is `return <Primitive {...props} />` is a wrapper without
structural behavior. Delete it and let consumers slot the primitive.
<!-- @/rule-summary -->

# component-api/no-wrapper-sub-component

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R12** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                            |
| ------------ | ------------------------------------------------------------------ |
| **Severity** | Warning                                                            |
| **Auto-Fix** | ❌ No (deleting the wrapper has consumer-side blast radius)         |
| **Category** | component-api                                                      |
| **Skill ID** | R12                                                                |

## Rule Details

Detects function components whose body is a pure passthrough — a single JSX
component element whose only attribute spreads the props the wrapper was given
(`(props) => <X {...props} />` or `({ ...rest }) => <X {...rest} />`) and zero
children. Declarations, `export default function`, arrows, function
expressions and `memo(...)`-wrapped components are all read. Spreading
something other than the props (`{...defaults}`) is not a passthrough. These wrappers add no structural behavior and force consumers
through an indirection layer for no benefit.

[MUI List controls](https://mui.com/material-ui/react-list/#list-controls) is
the canonical demonstration of the right pattern — slot `<Checkbox>` directly
into `<ListItem secondaryAction={…}>` instead of building a `<ListItemCheckbox>`
wrapper.

## Examples

### ❌ Incorrect

```tsx
function MyButton(props) {
  return <Button {...props} />;
}

const MyTrigger = (props) => <Dialog.Trigger {...props} />;
```

### ✅ Correct

```tsx
// Adds className or data-slot — structural
function Dialog(props) {
  return <BaseDialog.Root data-slot="dialog" {...props} />;
}

// Adds default children
function SubmitButton(props) {
  return <Button type="submit" {...props}>Submit</Button>;
}

// Or just delete the wrapper and let consumers import the primitive directly.
```

## Known False Negatives

- `forwardRef` wrappers (`<Button {...props} ref={ref} />`) carry a second attribute and are not detected.

Not a finding: a wrapper that destructures a named prop
(`function MyBtn({ label, ...rest }) { return <Button {...rest} />; }`) filters
the props it passes on, which is behaviour.

## Related

- **R12** (reuse primitives) — the parent principle.
- **R11** (`component-api/no-kind-prop-discriminator`) — paired enforcement on the API-shape side.
