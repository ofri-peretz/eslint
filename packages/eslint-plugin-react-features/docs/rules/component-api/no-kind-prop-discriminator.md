---
title: component-api/no-kind-prop-discriminator
description: Ban `type`/`kind` string-union props that switch between rendered trees — split into sub-components
tags: ['component-api', 'composition', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R11 from the `interlace-component` skill: a discriminated string-union
prop on a component (`type: "A" | "B"`) hides render branches and forces a
mega-component with prop bloat. Split into sub-components and let consumers
compose.
<!-- @/rule-summary -->

# component-api/no-kind-prop-discriminator

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R11** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                            |
| ------------ | ------------------------------------------------------------------ |
| **Severity** | Warning                                                            |
| **Auto-Fix** | ❌ No (the fix is structural — split into sub-components)           |
| **Category** | component-api                                                      |
| **Skill ID** | R11                                                                |

## Rule Details

The rule flags TypeScript properties named `type` or `kind` whose type is a
string-literal union of 2+ members. `variant` is **deliberately allow-listed**
because it's the dominant CVA shape and usually only switches `role` / class
contracts (not the element tree).

The "kind prop" anti-pattern: `<MyListItem selectable={{ type: "checkbox" }} />`
where the component internally branches the return tree on `type === "checkbox"
| "radio" | "switch"`. The fix is `<MyListItem><Checkbox /></MyListItem>` and
sub-components.

## Examples

### ❌ Incorrect

```ts
interface SelectableProps {
  type: "checkbox" | "radio" | "switch";
  // ...
}

function MyListItem({ selectable }: { selectable: SelectableProps }) {
  if (selectable.type === "checkbox") return <CheckboxRow />;
  if (selectable.type === "radio") return <RadioRow />;
  return <SwitchRow />;
}
```

### ✅ Correct

```tsx
<MyListItem>
  <MyListItem.Button onClick={handleToggle}>
    <MyListItem.Icon>
      <Checkbox checked={checked} tabIndex={-1} />
    </MyListItem.Icon>
    <MyListItem.Text>Email notifications</MyListItem.Text>
  </MyListItem.Button>
</MyListItem>
```

## Known False Positives

- **CVA discriminators that only switch `role`** (e.g. `variant: "list" | "listbox"`
  that flips `role={...}` on `<ul>` but renders the same tree) — flagged but
  acceptable. The reviewer-side check: *is the conditional just `role={...}`
  and nothing else?* If yes, the warning can be ignored or rename the prop to
  `variant` (which this rule allow-lists).
- This rule does not parse component bodies to verify the prop actually switches
  the tree — it flags the *shape* and lets review confirm intent.

## Related

- **R11** (composition over prop-drilling) — the parent principle.
- **R12** (`component-api/no-wrapper-sub-component`) — paired enforcement on the composition side.
