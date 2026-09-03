# Rule corpus - `secure-coding/no-missing-authentication` (CWE-287, CVSS 9.8)

**The question this corpus exists to answer:** the rule's whole verdict rests on
two spellings — is this object named like a router, and does any argument's
source text contain an authentication word. What survives when ordinary
production code is written by people who did not know about those lists?

## Score

| wave | TP | FP | FN | precision | recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| as shipped, wave 1 | 4 | 2 | 4 | 66.7% | 50.0% | **57.1%** |
| after wave-1 fixes | 8 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| + adversarial wave 2 | 9 | 1 | 3 | 90.0% | 75.0% | **81.8%** |
| after wave-2 fixes | 10 | 0 | 2 | 100.0% | 83.3% | **90.9%** |

12 vulnerable / 11 safe fixtures. No crashes.

## What the corpus proved

**`res.status(500)` switched the rule off — the widest defect here.**
`DEFAULT_PUBLIC_ROUTE_PATTERNS` contains `status`, and the rule matched those
patterns against `sourceCode.getText(node)`: the entire registration INCLUDING
the handler body. Every Express handler with an error path therefore silenced
the rule about its own missing authentication. `vulnerable/03-error-handling-branch.js`
is `vulnerable/01` plus a try/catch and nothing else. The default list describes
route PATHS, so it now matches only the path; a user-supplied `ignorePatterns`
is a deliberate escape hatch and still matches the whole call.

**`app` ⊂ `wrapper` (false positives).** `objectName.includes(name)` decided an
LRU cache (`wrapper.get(key)`) and a persistence layer (`dataMapper.delete(id)`)
were Express applications, in files that import no HTTP server at all. Router
identity now comes from the resolved binding first — `express()`, `express.Router()`,
`new Koa()` — with whole-word name matching only as the fallback for bindings
this file cannot resolve. A binding that resolves to `new Map()` or an object
literal is proof of the negative, which is the only thing that clears
`safe/09-map-accessors.js`, where `route` and `server` are honest whole words.

**The handler's own name counted as authentication (false negatives).**
`auth` ⊂ `getAuthorReport` (a CMS author) and `session` ⊂ `renderSessionRoster`
(a conference talk). Two fixes, both needed: middleware is matched on the
resolved callee name as whole words, and the LAST argument of a route
registration is the handler, so it is not a middleware candidate at all. `use`
is exempt, because `app.use('/api', authenticate())` legitimately mounts
middleware last.

**FALSE-NEGATIVE DIRECTION.** `vulnerable/07-api-alias.js` and
`vulnerable/11-gateway-binding.js` are the same admin route with the router
bound to `api` and to `gateway`. Both were invisible; both are now found,
because the binding still resolves to `express.Router()` / `express()` in the
same file. This is the half that better string matching cannot fix and binding
resolution can.

**`app.route(path).get(handler)`** — Express's own chaining API — was skipped
entirely, because the registration's object is a CallExpression. Fixed by
walking the chain back to the `route()` call.

## Documented misses (not fixed, deliberately)

- `vulnerable/10-dynamic-method.js` — `app[method](path, handler)` where the
  verb is a loop variable. Needs value tracking through the loop; the rule has
  no such model. The literal form `app['get'](...)` is also still missed.
- `vulnerable/12-noop-auth-middleware.js` — a local `function authenticate(req, res, next) { next(); }`.
  A guard IS present, so this rule's question is answered correctly; judging
  whether the guard can DENY belongs to `no-fail-open-auth`.
- CJS `const server = require('express')()` — the initialiser is a call whose
  callee is another call, so no factory name can be read off it. Pinned by a
  coverage test that asserts the fallback behaviour.
