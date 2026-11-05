---
'eslint-plugin-secure-coding': patch
---

fix(detect-object-injection): an `Object.keys` key narrowed by `.filter()` / `.slice()` / `.toSorted()` / `.toReversed()` is now treated as an own key, matching the direct `Object.keys(x).forEach` form. `.map()` chains still report.
