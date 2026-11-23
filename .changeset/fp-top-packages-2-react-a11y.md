---
'eslint-plugin-react-a11y': patch
---

Fix false positives found linting popular React packages.

- `no-missing-aria-labels`: an `aria-hidden="true"` control is not in the accessibility tree and needs no name; a `<button>` is named by text in a descendant element (`<button><span>Sign in</span></button>`), unless that element is `aria-hidden`; and a control whose `id` equals the `htmlFor` of a `<label>` with content in the same JSX tree is named, whether the value is a static string or the same template literal written twice. A label with no content, a different template, a label in a nested function, and a `<select>` with only options still report.
- `control-has-associated-label`: the same `id` / `htmlFor` naming is recognised.
