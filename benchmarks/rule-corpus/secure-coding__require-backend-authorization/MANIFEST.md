# Rule corpus - `secure-coding/require-backend-authorization` (CWE-602)

**The question this corpus exists to answer:** the CWE is "client-side
enforcement of server-side security". Can the rule tell client from server?

It could not. It had no evidence about where a file runs — not a `'use client'`
directive, not a browser global, not a server import, not even the file
extension. It matched an `if` whose test touched `role`, `isAdmin`,
`isAuthenticated`, `permissions` or `admin`, anywhere, and reported it as
"Authorization logic in client code".

So the corpus is split along exactly that axis: `vulnerable/` is browser code
that enforces (React components, a `'use client'` file, localStorage, a JWT
decoded in the browser), and `safe/` is **the remediation the rule prescribes** —
an Express middleware, a NestJS `CanActivate` guard, a Next.js route handler —
plus the two innocent uses of the vocabulary: an ARIA `role` and a mailbox
called `admin`.

## Score

| | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| before (as found) | 3 | 5 | 3 | 37.5% | 50.0% | 42.9% |
| after adversarial wave | 3 | 6 | 6 | 33.3% | 33.3% | **33.3%** |
| after fixes | 8 | 0 | 1 | 100.0% | 88.9% | **94.1%** |

## VERDICT: not vacuous — the opposite

This rule fires readily. Positive controls, run before any change:

```
if (user.role === 'admin') { showAdminPanel(); }                    → REPORTED
if (config.admin) { doThing(); }                                    → REPORTED
import express …; if (req.user.role !== 'admin') return res.status(403)  → REPORTED
```

The third is the defect. The rule told a developer to delete the server-side
403 that the message's own fix line — "Move authorization checks to server-side
API endpoints" — had just asked them to write. Three of the five original false
positives were that same shape in three different frameworks.

Its problem was never that it could not fire. It was that it fired on
everything shaped like an authorization check and then asserted, without
evidence, that the code was in a browser.

## What the corpus proved

**False positives (all fixed).**

| fixture | what it is | why it fired |
|---|---|---|
| `safe/01` | Express `requireAdmin` middleware | no server evidence consulted |
| `safe/02` | NestJS `CanActivate` guard | same |
| `safe/03` | Next.js route handler | same |
| `safe/04` | `mailbox.admin`, an email address | `admin` is in the property set |
| `safe/05` | `element.role === 'menuitem'`, an ARIA role | `role` is in the property set |
| `safe/08` | a DTO serialiser adding an optional field | same |

**False negatives (five of six fixed).** All were shape gaps: only a bare
`MemberExpression` test or a two-sided `BinaryExpression` was matched, so
`user?.role` (a ChainExpression wrapper), `permissions.includes(…)` (a
CallExpression), `switch (user.role)`, `user['role']` and one binding hop
(`const canExport = user.role === 'owner'`) were all invisible. Every one of
those is ordinary in a React codebase written after 2020.

**The fix, structurally.** A finding now needs a claim read reaching an `if`
test or a `switch` discriminant — found by walking up from the member access
through ESLint's own traversal, so any wrapper works — plus browser evidence
(a `'use client'` directive, a JSX element, or a reference resolving to
`window`/`document`/`localStorage`/`sessionStorage`/`navigator`) and NO import
of a server-only module.

## The one miss, kept deliberately

`vulnerable/08-renamed-property.jsx` gates on `user.accessLevel === 'FINANCE_ADMIN'`
in a React component. It is genuinely CWE-602 and the rule is silent.

The property-name set is this rule's one irreducible guess. Adding
`accessLevel`, `tier`, `scope`, `grants` and `capabilities` would catch it and
would then fire on every pricing tier and every OAuth scope in the ecosystem.
The false negative is cheaper than that trade, so it is recorded here rather
than bought.

## Known limitation

An accessibility helper that reads `element.role` **inside a JSX file** still
reports: JSX is browser evidence and `role` is in the claim set. `safe/05` is
quiet only because it holds no JSX element. Distinguishing an ARIA attribute
from a session claim needs type information this rule does not have.
