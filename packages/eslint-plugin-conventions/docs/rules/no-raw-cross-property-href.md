---
title: no-raw-cross-property-href
description: "Forbid hand-written cross-property hrefs; use buildUtmHref() from lib/utm.ts"
tags: ['quality', 'conventions']
category: quality
autofix: false
---

> Forbid hand-written hrefs between our own properties — route them through `buildUtmHref()`

<!-- @rule-summary -->

Forbid hand-written cross-property hrefs; use buildUtmHref() from lib/utm.ts
<!-- @/rule-summary -->

## Rule Details

Links between our own properties (docs → blog, blog → storybook, …) must carry
the UTM taxonomy so cross-property journeys are attributable. A hand-written
`<a href="https://eslint.interlace.tools">` ships without attribution and that
click becomes `$direct` noise on the destination.

`buildUtmHref()` is the one blessed constructor: it appends the canonical
`utm_source` / `utm_medium` pair for the property the code lives in. The rule
flags raw href literals pointing at any sibling property.

External links (GitHub, npm, MDN, …), same-site paths and anchors are ignored —
attribution is only our own cross-property problem.

## Examples

### ❌ Incorrect

```jsx
<a href="https://eslint.interlace.tools/docs">docs</a>
```

### ✅ Correct

```jsx
<a href={buildUtmHref('https://eslint.interlace.tools/docs')}>docs</a>

// Not cross-property — all fine as raw literals:
<a href="/docs">docs</a>
<a href="#section">jump</a>
<a href="https://github.com/ofri-peretz/eslint">gh</a>
```

## Configuration Examples

### Basic Usage

```js
// eslint.config.js
{
  rules: {
    'conventions/no-raw-cross-property-href': 'error',
  },
}
```

## When Not To Use It

Repositories with a single web property and nothing to cross-link. The rule
only pays for itself once two or more properties need joined-up analytics.
