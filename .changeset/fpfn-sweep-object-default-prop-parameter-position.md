---
'eslint-plugin-react-features': patch
---

fix: `no-object-type-as-default-prop` reported any object destructuring default, anywhere

The `AssignmentPattern` visitor's only gate was `node.parent.type === 'Property' || 'RestElement'`, which is true of ANY object destructuring — including a plain `const { components = {} } = plugin;` at module scope. The rule's own comment said "destructured parameter in a function component", but nothing checked for a function, a parameter, or a component, so the rule reported code that is not a prop, is never rendered, and runs exactly once. Every harm the docs cite — a new reference on every render, a broken `React.memo`, an ineffective `useMemo` — requires the default to be re-evaluated per render, which only a parameter does. The report is now additionally gated on the pattern spine terminating in a function's `params`. The pre-existing exclusion of whole-object parameter defaults (`function C(props = {})`) is unchanged.
