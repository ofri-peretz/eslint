---
'eslint-plugin-react-a11y': patch
'eslint-plugin-react-features': patch
---

fix: false positives in react-a11y label/anchor rules and react-features prop/runtime rules

- `control-has-associated-label` no longer reports a hidden input
  (`<input type="hidden">`) or any control with a spread attribute
  (`<input {...props} />`), whose label the call site cannot see.
- `no-missing-aria-labels` no longer reports a spread-prop input for the
  same reason.
- `label-has-associated-control` no longer reports a spread-prop label
  (`<label {...props} />`).
- `anchor-has-content` and `control-has-associated-label` no longer report
  an element passed as a render-prop/`asChild` value
  (`<Button render={<a href="/docs" />}>`), which is not rendered as
  written.
- `no-is-prefix-prop` (R8) no longer reports `isXxx: boolean` fields on a
  plain data interface/type alias that is never a component's props —
  only a type whose own name ends in `Props`.
- `react-in-jsx-scope` now also reads `settings.react.runtime: 'automatic'`
  as a project-wide opt-out, not only a per-file `@jsxRuntime automatic`
  comment.
