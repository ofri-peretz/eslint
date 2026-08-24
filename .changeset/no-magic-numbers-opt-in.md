---
'eslint-plugin-conventions': major
---

feat!: `recommended` no longer enables `no-magic-numbers`

It produced **1421** findings on the pinned 8-repository corpus — the largest
single source in the ecosystem — and the project's own triage records it as
"correct in contract, and a taste rule by nature". Those two facts together are
the argument: a taste rule on by default is what makes a consumer stop reading
the output, and an ignored tool has zero recall regardless of what it detects.

This is parity with upstream, not a novel opinion. ESLint core ships
`no-magic-numbers` and deliberately excludes it from `eslint:recommended`.

**Nothing is removed from the plugin.** The rule is still exported, documented
and tested — only its membership in `recommended` changed.

## Migration

If you were relying on `recommended` to enable it, add one line. Most projects
want the opposite and need to do nothing.

```js
// Before — enabled implicitly by the preset
export default [conventions.configs.recommended];

// After — enable it explicitly
export default [
  conventions.configs.recommended,
  { rules: { 'conventions/no-magic-numbers': 'warn' } },
];
```

Same reasoning as `eslint-plugin-import-next` 2.4.0, which dropped `order`,
`first` and `newline-after-import` from its `recommended`.
