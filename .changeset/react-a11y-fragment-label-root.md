---
'eslint-plugin-react-a11y': patch
---

fix(react-a11y): a `<label htmlFor>` under the same fragment names the control

`control-has-associated-label` and `no-missing-aria-labels` looked for a matching `<label htmlFor>` only under the nearest JSX element root, so `<><label htmlFor="x">Name</label><input id="x" /></>` reported the input as unlabelled. A fragment now counts as the tree root too. A label with a different `htmlFor`, or with no content, still reports.
