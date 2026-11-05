---
title: require-data-testid
description: Require stable data-testid attributes on interactive elements for end-to-end test reliability
tags: ['quality', 'conventions', 'testing']
category: quality
autofix: suggestions
---

# conventions/require-data-testid

Require stable `data-testid` attributes on interactive elements and custom
components for end-to-end test reliability.

## Why

E2E test selectors based on class names break on every styling refactor.
Selectors based on visible text break with copy edits and i18n. Selectors
based on `data-testid` are invisible at runtime, untouchable by Tailwind
churn, and stable across refactors.

This rule pairs with the
[a11y self-test philosophy](../../../../apps/docs/A11Y.md) — Layer 3:
edit-time enforcement of conventions that survive past Layer 1 (axe).

## Rule details

By default, the rule flags:

- Native interactive elements: `<button>`, `<input>`, `<select>`,
  `<textarea>`, `<form>`
- `<a>` with `href` or `onClick` (in-page anchors without those are
  ignored)
- Custom React components (names matching `componentPattern`, PascalCase by
  default) that handle an `on*` event (`onClick`, `onChange`, …). Set
  `componentRequiresHandler: false` to flag every component; presentational
  wrappers are not test targets by default.
- Any name listed in `requireOn`, whatever else it matches.

If `data-testid` is present but its value is computed (e.g. a function call,
`Math.random()`, `Date.now()`) or is the boolean shorthand `data-testid`,
it's flagged separately as `dynamicDataTestId`. A string literal, a template
literal of references, a reference to a value (`TEST_ID`, `ids.submit`) and
a choice between stable values (`ok ? 'save' : 'cancel'`) are all stable.

If the element receives `{...props}`, the rule assumes the parent supplies
`data-testid` and skips it (avoids double-flagging in pure render-forward
components).

### Options

```jsonc
{
  "conventions/require-data-testid": [
    "warn",
    {
      // Add element / component names that must carry data-testid.
      "requireOn": ["thead", "tbody"],

      // Skip these even when the rule would default-flag them.
      "ignore": ["VisuallyHidden", "Slot"],

      // Regex string — names matching this are treated as components.
      // An empty string turns component checks off.
      "componentPattern": "^[A-Z]",
      // Flag a component only when it has an `on*` handler. Default: true.
      "componentRequiresHandler": true,

      // Reject computed `data-testid` values. Default: true.
      "enforceStableValues": true
    }
  ]
}
```

### Examples

✅ Correct:

```tsx
<button data-testid="submit">Submit</button>
<a data-testid="docs-link" href="/docs">Docs</a>
<MyButton data-testid="primary-cta" onClick={go}>Go</MyButton>
<MyButton>Go</MyButton> // no event handler: not a test target by default
<button data-testid={`page-${pageNumber}`}>Next</button>

// Spreading parent props — parent owns the testid.
function ForwardingButton(props) {
  return <button {...props} />;
}
```

❌ Incorrect:

```tsx
<button>Submit</button>
<a href="/docs">Docs</a>
<MyButton onClick={go}>Go</MyButton>
<button data-testid={Math.random()}>Unstable</button>
```

## Naming convention

While this rule enforces *presence* and *stability*, it does not enforce
naming. By repo convention:

- Lower-kebab-case (`clear-search`, not `clearSearch`)
- Hierarchical when nested: `pagination` → `pagination-prev`,
  `pagination-next`, `pagination-page-1`
- Match the visible action verb where possible: `clear-search`,
  `toggle-theme`, `submit-form`

## When not to use

If you don't run E2E tests, this rule has no benefit and adds noise.

## Related

- [a11y self-test philosophy](../../../../apps/docs/A11Y.md#self-test-philosophy--layered-defense)
- [packages/ui/CONVENTIONS.md](../../../../packages/ui/CONVENTIONS.md)
