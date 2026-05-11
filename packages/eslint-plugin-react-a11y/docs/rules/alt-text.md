---
title: alt-text
description: Enforce alt text on images and other visual elements that carry accessibility impact.
tags: ['accessibility', 'a11y', 'react', 'wcag']
category: quality
cwe: CWE-252
autofix: suggestions
---

> **Keywords:** alt-text, accessibility, a11y, WCAG, screen reader, img alt, role=presentation, aria-label, object alt, area alt, ESLint rule

> **WCAG:** [1.1.1 Non-text Content (Level A)](https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html)

<!-- @rule-summary -->
Enforce alt text on images and other visual elements that carry accessibility impact. Missing alt text breaks screen readers, blocks Lighthouse a11y audits, and fails WCAG 1.1.1 (Level A).
<!-- @/rule-summary -->

This rule is part of [`eslint-plugin-react-a11y`](https://www.npmjs.com/package/eslint-plugin-react-a11y).

## Quick Summary

| Aspect         | Details                                                             |
| -------------- | ------------------------------------------------------------------- |
| **Severity**   | Critical (Accessibility — WCAG Level A)                             |
| **Auto-Fix**   | 💡 Suggestions (placeholder alt, `role="presentation"` → `alt=""`)  |
| **Category**   | React Accessibility                                                 |
| **WCAG**       | 1.1.1 Non-text Content (Level A)                                    |
| **Best For**   | Any React application; mandatory for sites with WCAG conformance    |

## What the rule checks

The rule covers every element that conveys non-text content to sighted users:

| Element            | Required                                            | Empty `alt=""` allowed?                                              |
| :----------------- | :-------------------------------------------------- | :------------------------------------------------------------------- |
| `<img>`            | `alt`, or `role="presentation"` paired with `alt=""` | Yes — only for decorative images                                     |
| `<area>` (image map) | `alt` describing the link target                  | No                                                                   |
| `<input type="image">` | `alt` or `aria-label` describing the action     | No                                                                   |
| `<object>`         | Inner text, `aria-label`, `aria-labelledby`, or `title` | n/a — alt isn't valid on `<object>`                              |

## Examples

### ❌ Incorrect

```jsx
<img src="hero.jpg" />                     // missing alt
<img src="hero.jpg" alt="" />              // empty alt without role="presentation"
<img src="hero.jpg" role="presentation" /> // role without alt=""
<input type="image" src="submit.png" />    // no accessible name
<area shape="rect" coords="0,0,82,126" href="/products" />  // missing alt
<object data="diagram.svg" />              // no text alternative
```

### ✅ Correct

```jsx
<img src="hero.jpg" alt="Customer service agent helping a user" />
<img src="divider.svg" alt="" role="presentation" />        // decorative
<img src="logo.svg" alt="Acme Corp" />
<input type="image" src="submit.png" alt="Submit form" />
<area shape="rect" coords="0,0,82,126" href="/products" alt="View product catalog" />
<object data="diagram.svg" aria-label="System architecture diagram">
  System architecture diagram (fallback text)
</object>
```

## Error Message Format

```text
♿ REACT-A11Y CWE-252 | Image missing alt text | CRITICAL
   Fix: Add a descriptive `alt` attribute, or mark the image decorative with `role="presentation"` and `alt=""`.
```

## Known False Negatives

- Image-like usage via background CSS (`<div style={{ backgroundImage }} />`) is not flagged — CSS-painted images are outside the rule's scope and should use an explicit `<img>` when they carry meaning.
- Dynamically composed alt text (e.g. `alt={maybeUndefined}`) is accepted; the rule cannot prove the runtime value will not be empty. Pair with TypeScript narrowing to make the `alt` prop required at the type level.
- Custom image wrappers that re-export `<img>` via a generic prop spread are tracked only when the component name follows the `Image`/`Img`/`Picture` heuristic.
