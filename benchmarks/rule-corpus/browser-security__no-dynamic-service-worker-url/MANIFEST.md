# Rule corpus — `browser-security/no-dynamic-service-worker-url` (CWE-829)

Written from CWE-829 semantics and real registration idiom, **not** from the
rule's own test file. The point is independent evidence: a corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet. Every competitor is
scored on exactly the same files.

## What the rule claims

`meta.docs.description` — "Disallow dynamic URLs in service worker
registration". The stake is unusually high for a URL rule: a service worker
outlives the tab and proxies every request on the origin, so a single
attacker-chosen registration is persistent, origin-wide control.

## The question the rule has to answer

Not "is this argument a string literal" — that is a syntactic proxy, and it was
the whole test. It reported three provably-static spellings:

- `const SW_URL = '/sw.js'` extracted to a module constant (`safe/03`)
- a template literal with no expressions (`safe/05`)
- `new URL('./sw.js', import.meta.url)` (`safe/04`) — **the idiom Vite, webpack 5
  and Parcel all prescribe.** The recommended way to register a worker was the
  one thing the rule flagged.

The real question is "can an attacker influence this value", which is what
`isStaticExpression` answers.

## Waves

`01`–`09` are the first wave: a remote config, a query parameter, an
interpolated tenant slug, a concatenation, an array index, a helper hop,
optional chaining, a React prop, and the `window.`-qualified global.

`10`–`12` are the **adversarial wave**:

- `10` destructures the container first, so `navigator.serviceWorker.register`
  never appears as one chain.
- `11` uses the `new URL()` bundler idiom with an attacker-chosen **base**. The
  path argument is a harmless literal; the origin is the payload. A rule that
  whitelists `new URL(...)` on the strength of its first argument hands the
  attacker the whole worker.
- `12` is a binding that *looks* folded — declared with a static literal — but is
  written again before use.

`safe/06` and `safe/07` are the adversarial safe direction: `register` is an
extremely common method name (routers, DI containers), and a plugin host may
have its own `serviceWorker` field. Only the receiver separates them from the
browser's container.
