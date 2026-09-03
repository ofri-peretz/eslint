---
title: component-api/no-raw-color-literal
description: No raw hex / rgb / hsl / oklch color literals in source — use design tokens
tags: ['component-api', 'tokens', 'color', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R19 from the `interlace-component` skill: colors live in design tokens
via CSS custom properties or Tailwind theme classes wired to them. Raw color
literals fork the design system.
<!-- @/rule-summary -->

# component-api/no-raw-color-literal

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R19** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                |
| ------------ | ------------------------------------------------------ |
| **Severity** | Warning                                                |
| **Auto-Fix** | ❌ No (token mapping is a design decision)              |
| **Category** | component-api                                          |
| **Skill ID** | R19                                                    |

## Rule Details

Detects color literals in formats: hex (`#…`), `rgb(...)`, `rgba(...)`,
`hsl(...)`, `hsla(...)`, `oklch(...)`, `oklab(...)`.

Scoped to common component-source surfaces — JSX attribute string values, object
literals inside JSX expressions (e.g. `style={{ color: "#…" }}`), and the
arguments to common class-name builders (`cn`, `clsx`, `twMerge`, `classNames`).
This scoping keeps the rule focused on the source that ships to consumers and
minimizes false positives in tests / fixtures / docs.

## Examples

### ❌ Incorrect

```tsx
<div style={{ color: "#ff0000" }} />
<div style={{ background: "rgb(255, 0, 0)" }} />
<div className="bg-[#ff0000]" />
cn("text-[#fff]")
```

### ✅ Correct

```tsx
<div style={{ color: "var(--snp-navy-900)" }} />
<div className="bg-primary" />
cn("text-foreground")
```

## Known False Negatives

- Colors stored in identifiers (`const RED = "#ff0000";`) are not traced.
- String concatenation (`"#" + hex`) isn't statically detectable.
- Computed Tailwind class names assembled at runtime aren't scanned.

## Related

- **R19** (`component-api/no-arbitrary-token-class`) — paired enforcement on spacing/radius.
- **R18** (`component-api/no-inline-style`) — Tailwind-only static styling.
