# Rule corpus — `browser-security/no-eval` (CWE-95)

Written from CWE-95 semantics and real front-end idiom, **not** from the rule's
own test file. The point is independent evidence: a corpus derived from the
tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What the rule claims

`meta.docs.description` — "Disallow eval(), Function(), and other code
execution patterns". So: every way a string becomes executing code, in a
browser or a worker.

## Partition with `no-websocket-eval`

A WebSocket-derived payload is the sibling rule's, and appears in **its**
corpus, not this one. Every other message source — Worker, SharedWorker,
FileReader, `postMessage` — has no rule of its own and is therefore this rule's
(`vulnerable/10-postmessage-payload.jsx`). The two sink lists are shared code
(`src/utils/dynamic-code-sinks.ts`), so the corpora do not overlap.

## Waves

`01`–`10` are the first wave: the shapes a front-end codebase actually writes —
a plugin loader, a React formula field, a service worker, a timer, a helper hop,
an array index, optional chaining, `window`-prefixed and computed access.

`11`–`14` are the **adversarial wave**, written after the rule reached 100% and
aimed squarely at breaking it. Every one reaches the evaluator without the
evaluator's name appearing at the call site: an aliased binding, `(0, eval)`,
`[].constructor.constructor`, and `Function` invoked without `new`. All four
were missed by the shipped rule.

`safe/04` and `safe/08` are the adversarial direction of the same idea: a
library method that merely shares the built-in's name, and a local declaration
that shadows it. Both must stay quiet, and a rule that matches on spelling
cannot manage both at once.
