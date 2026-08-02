---
'eslint-plugin-lambda-security': patch
---

Close two detection gaps found while linting a real serverless example.

**`no-unvalidated-event-body` — see past value-preserving wrappers.** The safe-pattern checks only looked at `event.body`'s *direct* parent, so `schema.safeParse(JSON.parse(event.body ?? '{}'))` — the standard way to give an optional API Gateway body a default — was a CVSS 8.0 finding: the `??` sat between the property access and the validating call and defeated every check. The rule now walks past `??` / `||`, `as` assertions and `!` non-null assertions before deciding, which also fixes `if (event.httpMethod === 'POST' && event.body)` being reported as unvalidated.

**`no-permissive-cors-response` — read implicit-return arrow bodies.** The rule only inspected explicit `return { statusCode, headers, body }` statements and `*response*`-named variables, so the idiomatic response helper `const jsonResponse = (statusCode, data) => ({ statusCode, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) })` was invisible — the exact shape most handlers funnel every response through. Concise arrow bodies returning a Lambda-shaped object are now checked, with the same `statusCode`/`body` gate so ordinary config objects stay unflagged.
