---
title: component-api/no-inline-style
description: No inline `style={{}}` for static styling — Tailwind classes only; CSS-variable assignment is the lone exception
tags: ['component-api', 'styling', 'tailwind', 'react']
category: component-api
autofix: false
---

<!-- @rule-summary -->
Enforces R18 from the `interlace-component` skill: static styling lives in Tailwind
classes wired to design tokens. Inline `style={{}}` is reserved for genuinely
dynamic values — most often a CSS-variable assignment.
<!-- @/rule-summary -->

# component-api/no-inline-style

Part of [`eslint-plugin-react-features`](https://www.npmjs.com/package/eslint-plugin-react-features).
Implements rule **R18** of the [portable component-modeling floor](https://github.com/ofri-peretz/agents/blob/main/skills/interlace-component/SKILL.md).

## Quick Summary

| Aspect       | Details                                                                |
| ------------ | ---------------------------------------------------------------------- |
| **Severity** | Warning                                                                |
| **Auto-Fix** | ❌ No (the Tailwind class needs to be picked — possibly a new token)    |
| **Category** | component-api                                                          |
| **Skill ID** | R18                                                                    |

## Rule Details

Inline `style` props bypass the token system and create one-off styling that's
invisible to design-token tooling, refactors, and theme audits. Static values
belong in Tailwind classes; dynamic positions belong in CSS variables that the
component sets via inline style and consumes via class.

This rule flags `style={{...}}` where **any** property has a static literal
value (string or number) and the property key isn't a CSS variable. CSS-variable
assignment (`style={{ "--snp-x": x }}`) is explicitly allowed.

## Examples

### ❌ Incorrect

```tsx
<div style={{ padding: "10px" }} />          // static value
<div style={{ width: 100 }} />               // static number
<div style={{ padding: "10px", left: x }} /> // mixed — still flagged
```

### ✅ Correct

```tsx
<div className="p-2.5" />                          // Tailwind token class
<div style={{ "--snp-x": x }} className="left-[var(--snp-x)]" /> // CSS variable
<div style={{ left: x, top: y }} />                 // genuinely dynamic
<div style={styles} />                              // identifier reference
```

## Known False Negatives

- Static values spread via a variable (`const styles = { padding: "10px" }; <div style={styles} />`) aren't detected — flatten the inline literal into Tailwind classes if it's truly static.
- Tagged template literals or computed property keys are not analysed.

## Related

- **R19** (`component-api/no-raw-color-literal`, `component-api/no-arbitrary-token-class`) — tokens-only enforcement.
