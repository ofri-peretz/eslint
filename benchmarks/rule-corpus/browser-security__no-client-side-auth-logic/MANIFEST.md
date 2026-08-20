# Rule corpus — `browser-security/no-client-side-auth-logic` (CWE-602)

Written from CWE-602 semantics and real front-end idiom — a role gate in a
React component, a "remember me" comparison, an admin nav item — **not** from
the rule's own test file.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## What "vulnerable" means here

An **authorization decision** taken in code the user controls. The browser's
storage is the user's storage: `localStorage.setItem('role','admin')` in the
console is one line. What makes it CWE-602 is that the branch DECIDES access,
not that a string in it is spelled a certain way — which is the defect this
rule shipped with. `localStorage.getItem('recipe-casserole-draft')` reached
every consumer of the `recommended` preset as a CRITICAL finding, because
`role` is a substring of `casserole`. `safe/01` pins that.

Reading a flag to decide what to RENDER is not the same as deciding access,
but it is the same code, and the rule cannot see the server behind it — so
the rendering-only shapes in `safe/` are the ones where nothing is being
authorized at all: a theme, a draft, a feature preference.
