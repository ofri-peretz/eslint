---
'eslint-plugin-maintainability': patch
---

fix(maintainability): `cognitive-complexity` charges conditionals inside JSX

The scoring walk followed a fixed child-key list with no JSX keys, so it stopped at
every JSXElement and JSXFragment: `cond && <X />`, `a ? <A /> : <B />` and conditionals
in attribute values scored 0, although the docs charge +1 for `? :` and for each
`&&`/`||` sequence. The walk now descends through `children`, `openingElement` and
`attributes`, so a component's markup is scored like the rest of its body.
