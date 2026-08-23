---
'eslint-plugin-import-next': minor
---

`recommended` no longer enables `order`, `first` or `newline-after-import`.

All three are pure formatting, fully auto-fixable, and together produced
**5,071** of this plugin's findings on the pinned 8-repository corpus —
`order` 3,597, `newline-after-import` 835, `first` 639.

A consumer who installs a security-positioned ecosystem and is met by four
thousand import-ordering warnings does not read them and does not keep the
plugin. The README's own FP/FN section makes the argument: an ignored tool has
zero recall regardless of what it detects.

This is parity with upstream rather than a novel opinion.
`eslint-plugin-import`'s `recommended` is eight rules and excludes all three
deliberately, and ESLint core deprecated its own formatting rules in 8.53 on
the same reasoning — formatting belongs to a formatter.

**Nothing is removed from the plugin.** `import-style` and `strict` already
carry all three, so opting back in is one config line:

```js
import importNext from 'eslint-plugin-import-next';

export default [
  importNext.configs.recommended,
  importNext.configs['import-style'], // ← restores order / first / newline-after-import
];
```
