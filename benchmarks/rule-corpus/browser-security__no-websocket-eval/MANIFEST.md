# Rule corpus — `browser-security/no-websocket-eval` (CWE-95)

Written from CWE-95 semantics and real WebSocket idiom, **not** from the rule's
own test file. The point is independent evidence: a corpus derived from the
tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What the rule claims

`meta.docs.description` — "Disallow using eval() or Function() with WebSocket
message data". The claim is narrower than `no-eval`'s on purpose: this rule owns
the sites where the executed value is provably a socket frame, and says so —
naming the source, the attacker position (a compromised server or a MITM) and
the fix.

## Read `safe/` carefully

Half of `safe/` is not benign code. `safe/03`, `safe/04`, `safe/05` and `safe/07`
are **real vulnerabilities that belong to `no-eval`**, and appear here to pin the
partition: this rule must not claim a provenance it cannot prove. A finding that
cites the WebSocket MDN page for code containing no WebSocket is worse than no
finding, and `safe/04` is exactly that shape — `window.addEventListener('message')`
has the same handler shape as a socket's, and only the receiver separates them.

`safe/06` and `safe/07` are the adversarial direction: a nested parameter that
shadows the handler's, and a receiver that arrives as a parameter. Both are
decided by resolving a **binding**, never a name.

`safe/10` pins the handler-attachment set: `onopen` carries no frame, and a
shared handler-name set once made both rules disown the site.

## Waves

`01`–`08` are the first wave: the shapes a front-end codebase writes — a quotes
feed, a chat log, a React effect, both attachment spellings, a nested payload
property, and the `window.`-prefixed and computed reaches for the evaluator.

`09`–`11` are the **adversarial wave**: an aliased evaluator, `(0, eval)`, and
`Function` without `new`. All three were missed by the shipped rule, whose sink
list was a private `{eval, Function}` set matched on a bare identifier callee.
`04`, `05` and `06` were missed by BOTH rules in the pair for the same reason.
