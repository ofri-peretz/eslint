---
title: utm-taxonomy
description: "Validate utm_source and utm_medium values against the fixed taxonomy in UTM_PHILOSOPHY.md"
tags: ['quality', 'conventions']
category: quality
autofix: false
---

> Validate `utm_source` / `utm_medium` values against the fixed taxonomy

<!-- @rule-summary -->

Validate utm_source and utm_medium values against the fixed taxonomy in UTM_PHILOSOPHY.md
<!-- @/rule-summary -->

## Rule Details

UTM values are an enum, not free text. `utm_source=devto` and
`utm_source=dev.to` split one channel into two rows of every acquisition
report, and no dashboard can merge them after the fact. The rule validates any
URL literal carrying UTM parameters against the fixed source/medium taxonomy in
UTM_PHILOSOPHY.md.

URLs without UTM parameters are ignored — the rule constrains spelling, it does
not require attribution (that is `no-raw-cross-property-href`'s job).

## Examples

### ❌ Incorrect

```js
const a = 'https://eslint.interlace.tools/?utm_source=dev_to';   // canonical is 'devto'
const b = 'https://eslint.interlace.tools/?utm_source=Blog';     // case matters
const c = 'https://eslint.interlace.tools/?utm_medium=newsletter'; // not in the medium taxonomy
```

### ✅ Correct

```js
// 'devto' (not 'dev_to') is deliberate: the blog's /go/ redirect handler
// routes by utm_source, and those rows are stored as 'devto'.
const a = 'https://eslint.interlace.tools/?utm_source=devto';
const b = 'https://eslint.interlace.tools/?utm_source=github&utm_medium=docs';
const plain = 'https://example.com/path';      // no UTM params — ignored
const rel = '/relative/path';                  // ignored
```

## Configuration Examples

### Basic Usage

```js
// eslint.config.js
{
  rules: {
    'conventions/utm-taxonomy': 'error',
  },
}
```

## When Not To Use It

Codebases that do not standardise on UTM_PHILOSOPHY.md's taxonomy. The value
list is ours; without adopting the taxonomy the rule is only noise.
