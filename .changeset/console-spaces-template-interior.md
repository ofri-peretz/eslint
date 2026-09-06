---
'eslint-plugin-conventions': patch
---

fix: `no-console-spaces` no longer reports the space beside an interpolation in a template literal

``console.error(`No workflows dir at ${dir}`)`` was reported because the
quasi before `${dir}` ends with a space. The rule looped over every quasi and
reported any that began or ended with whitespace, so every template literal
that put a space next to `${…}` was a finding.

The rule is about leading/trailing whitespace of the whole argument, which
console would duplicate when it joins parameters. For a template literal that
means only the first quasi's leading whitespace and the last quasi's trailing
whitespace. Interior boundaries around interpolations are the body of one
string, and are no longer checked.
