---
'eslint-plugin-react-a11y': patch
---

`no-missing-aria-labels`: no longer reports `<button><img alt="Save" /></button>`. An intrinsic `<img>` or `<area>` with a non-empty (or dynamic) `alt` names its parent, as `control-has-associated-label` already agreed. An empty or missing `alt`, `aria-hidden`, and a hidden wrapper still report.
