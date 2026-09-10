---
'eslint-plugin-conventions': minor
---

feat!: `consistent-existence-index-check` defaults to `Object.hasOwn`, not `in`

A default is what a codebase gets for having no opinion, and this one pointed every such codebase at `in` — the one form of the three that answers `true` for an INHERITED key. That is the direction a prototype-pollution guard is written to avoid.

`Object.hasOwn` exists because `in` and the `hasOwnProperty` dances were each the wrong answer often enough for the language to add a third; eslint core's `prefer-object-has-own` points the same way.

**What changes for a consumer who set no options.** `key in obj` is now reported and `Object.hasOwn(obj, key)` is not — the reverse of before. Nothing is rewritten across that boundary in either direction: `in` and the own-property checks ask different questions, so only the report is made. The single autofix, `Object.prototype.hasOwnProperty.call(obj, key)` → `Object.hasOwn(obj, key)`, is unchanged.

## Migration

If you set no options and want the old behaviour, name it:

```js
// before — `in` by default
{
  rules: {
    'conventions/consistent-existence-index-check': 'error',
  },
}

// after — the same behaviour, stated
{
  rules: {
    'conventions/consistent-existence-index-check': ['error', { preferred: 'in' }],
  },
}
```

If you want the new default, change nothing in your config and fix the reports:

```js
// before — reported under the new default
if (key in obj) {
}

// after
if (Object.hasOwn(obj, key)) {
}
```

`--fix` will not do that second one for you, deliberately: `in` also answers for inherited keys, so a machine cannot know whether your code wanted that. Only `Object.prototype.hasOwnProperty.call(obj, key)` → `Object.hasOwn(obj, key)` is autofixed.

`preferred: 'in'` remains the right setting where a prototype-chain lookup is what the code means. It is now a choice someone makes rather than one they inherit.

The rule's docs carried a `❌ obj.hasOwnProperty` / `✅ array.includes` example pair that described a different rule entirely; they now show the three reported forms, the one safe rewrite, and why the others are report-only.
