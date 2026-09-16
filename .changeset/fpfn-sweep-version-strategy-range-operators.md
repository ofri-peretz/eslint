---
'eslint-plugin-conventions': patch
---

fix: `prefer-dependency-version-strategy` no longer autofixes a range into a caret

Under the default `caret` strategy the fixer stripped a range OPERATOR as though it were a prefix, so `<2.0.0` autofixed to `^2.0.0` — and the two are disjoint (`semver.intersects('<2.0.0', '^2.0.0') === false`), meaning an unattended `--fix` installed the very major the author had pinned away from. `1.0.0 - 2.0.0` became `^1.0.0 - 2.0.0`, which `semver.validRange` rejects outright. It was never a deliberate policy either: the rule's entry gate admits exactly one operator character, so `>=1.0.0 <2.0.0` — this rule's own documented example of a range — was already exempt while its one-character cousins were rewritten. Range specifiers are now left alone by the `caret`, `tilde` and `exact` strategies, using the same predicate the `range` strategy already applies. Plain versions are still caret-ed exactly as before.
