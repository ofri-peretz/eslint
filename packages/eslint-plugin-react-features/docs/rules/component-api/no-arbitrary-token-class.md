---
title: component-api/no-arbitrary-token-class
description: No Tailwind arbitrary values when a token exists for the property (spacing, radius, gap, padding, margin)
tags: ['component-api', 'tokens', 'tailwind', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R19 from the `interlace-component` skill: don't use Tailwind arbitrary-value
classes (`rounded-[12px]`, `px-[18px]`) on properties that have a design-token
equivalent. The spacing scale exists for a reason — `mb-12` next to `mb-14` next
to `mb-16` is the smell this rule prevents.
<!-- @/rule-summary -->

# component-api/no-arbitrary-token-class

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R19** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                |
| ------------ | ------------------------------------------------------ |
| **Severity** | Warning                                                |
| **Auto-Fix** | ❌ No (token choice is a design decision)               |
| **Category** | component-api                                          |
| **Skill ID** | R19                                                    |

## Rule Details

Scans `className="..."` strings (and `cn`/`clsx`/`twMerge` arguments) for
`<prop>-[<value>]` patterns. Reports when:

- `<prop>` is in the tokenizable set: `rounded*`, `p*` (`p`, `px`, `py`, `pt`,
  `pb`, `pl`, `pr`), `m*` (same pattern), `gap`, `gap-x`, `gap-y`, `space-x`,
  `space-y`.
- `<value>` is a simple pixel/rem/em literal (`12px`, `1.5rem`, `2em`).

**Explicitly allowed** arbitrary values that don't trip the rule:

- CSS-variable references: `rounded-[var(--snp-radius-300)]`.
- Computed expressions: `w-[calc(100%+36px)]`.
- Non-token unit values: `min-h-[60vh]`, `w-[50%]`.
- Data-attribute / state selectors: `data-[state=open]:bg-red`.
- Properties not in the tokenizable set (e.g. `text-[14px]` for inline type
  overrides — although TYPOGRAPHY_PHILOSOPHY may have an opinion).

## Examples

### ❌ Incorrect

```tsx
<div className="rounded-[12px] px-[18px]" />
<div className="gap-[1.5rem]" />
cn("rounded-[12px]")
```

### ✅ Correct

```tsx
<div className="rounded-md px-4" />
<div className="gap-6" />
<div className="rounded-[var(--snp-radius-300)] px-[var(--snp-spacing-md)]" />
<div className="w-[calc(100%+36px)] min-h-[60vh]" /> {/* justified arbitrary */}
```

## Known False Negatives

- Class strings built by string concatenation aren't traced.
- Template-literal interpolations with dynamic prop fragments are skipped.
- Custom class-name builders not in `cn`/`clsx`/`twMerge`/`classNames` are
  ignored — extend the rule if you have a project-specific builder.

## Related

- **R19** (`component-api/no-raw-color-literal`) — paired enforcement on colors.
- **R18** (`component-api/no-inline-style`) — Tailwind-only static styling.
