---
title: no-onchange
description: Deprecated no-op kept so eslint-plugin-jsx-a11y configs naming it load; it reports nothing.
tags: ['accessibility', 'a11y', 'react', 'deprecated']
category: quality
deprecated: true
---

<!-- @rule-summary -->

Deprecated no-op kept so eslint-plugin-jsx-a11y configs naming it load; it reports nothing.
<!-- @/rule-summary -->

# no-onchange

> **Keywords:** no-onchange, deprecated, eslint-plugin-jsx-a11y, migration, ESLint rule

Upstream's rule asked for `onBlur` instead of `onChange` on a `select`. jsx-a11y 6.10.2 deprecates it without naming a replacement. This rule is a no-op.

## Quick Summary

| Aspect         | Details                                          |
| :------------- | :----------------------------------------------- |
| **Status**     | Deprecated (`meta.deprecated: true`)             |
| **Reports**    | Nothing                                          |
| **In presets** | No preset enables it                             |
| **Options**    | An object, as upstream's schema; nothing is read |

## Why it exists

eslint-plugin-jsx-a11y 6.10.2 still exports this rule, deprecated. A config that registers this plugin under the `jsx-a11y` key and names `no-onchange`, or a `// eslint-disable-next-line jsx-a11y/no-onchange` comment, would otherwise stop ESLint with "Could not find rule". With this entry it loads and does nothing.

## Configuration

```javascript
// eslint.config.js
import reactA11y from 'eslint-plugin-react-a11y';

export default [
  {
    plugins: { 'jsx-a11y': reactA11y },
    rules: { 'jsx-a11y/no-onchange': 'off' },
  },
];
```

## Further Reading

- [eslint-plugin-jsx-a11y no-onchange](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y/blob/v6.10.2/docs/rules/no-onchange.md)
