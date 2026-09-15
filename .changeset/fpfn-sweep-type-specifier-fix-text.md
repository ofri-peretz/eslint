---
'eslint-plugin-import-next': patch
---

fix: `consistent-type-specifier-style` no longer emits a `Fix:` instruction that drops `type` from every specifier but the first. The `type` marker sat outside the `{{name}}` interpolation while the data bound a comma-joined list, so an import of more than one name rendered as `import { type A, B }` — following it demotes every later specifier to a value import, which under `verbatimModuleSyntax` is emitted verbatim and throws at runtime. The autofix was already correct; only the emitted guidance disagreed with it.
