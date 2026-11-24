---
'eslint-plugin-react-a11y': patch
---

fix: an empty descendant and a ternary between text literals in accessible-name checks

- `control-has-associated-label` and `no-missing-aria-labels` no longer treat
  an empty intrinsic descendant (`<label><span /></label>`) as label content —
  a `<span>` with nothing inside gives a screen reader nothing to announce. A
  custom component descendant still counts, since its render output isn't
  visible here.
- `no-missing-aria-labels` now also recognizes a ternary between two
  text-like expressions (`{on ? "Turn off" : "Turn on"}`) as text content,
  closing a gap in the prior fix for text-like expression children.
