---
'eslint-plugin-browser-security': patch
'eslint-plugin-node-security': patch
'eslint-plugin-secure-coding': patch
---

Four false positives found by scanning nineteen open-source repositories.

Round two of the adoption loop, every finding read in source before it was
judged. Each of these reported correct code as a vulnerability.

- `node-security/detect-eval-with-expression` and
  `secure-coding/no-unsafe-deserialization` treated an imported `Function` as the
  `Function` constructor. `Function` from `aws-cdk-lib/aws-lambda` is an AWS
  Lambda construct that deploys a handler and compiles nothing, so
  `new Function(this, id, { runtime: Runtime.PYTHON_3_11 })` — how every CDK
  stack declares a lambda — was a code-execution finding. Thirty of them in one
  6 KLOC library. All three report paths now resolve the identifier through the
  scope analyser; an unresolved identifier still reports, because that is what
  being the global means.
- `browser-security/no-credentials-in-query-params` reported the shape RFC 6749
  §2.3.1 prescribes: `body: \`client_id=${id}&client_secret=${s}&token=${t}\``,
OAuth 2.0 sending credentials the way the spec says to. A query string and a
form-encoded body are the same characters, so the exemption is positional — a
`body`/`data`/`form`property value, or a`URLSearchParams` argument. The same
  string in a URL still reports.
- `secure-coding/no-improper-type-validation` reported the correct null-safe
  idiom `typeof x == 'object' && x !== null`, because its `typeof` arm accepted
  only `===`/`!==` and the loose spelling fell through to the type-juggling arm.
  Both operators now reach the `typeof` arm, which also gains recall: an
  unguarded `typeof x == 'object'` reports the right message instead of the
  wrong one. The rule also leaves the `owasp-top-10` preset, where its
  loose-equality arm — 126 findings across 78 KLOC — re-reported `eqeqeq` under
  a security banner, the same reason `no-insecure-comparison` left it. A new
  `checkLooseEquality: false` keeps the three structural arms without it.

Adds `benchmarks/fp-gate/`, a corpus of code read by hand and confirmed benign,
mostly lifted verbatim from real repositories with provenance recorded. A rule's
own fixtures only contain code that already looks like its target domain, which
is why none of these were caught: every `require-algorithm-whitelist` fixture
names the receiver `jwt`. The gate ratchets, and aborts rather than report a
partial count when a plugin fails to load.
