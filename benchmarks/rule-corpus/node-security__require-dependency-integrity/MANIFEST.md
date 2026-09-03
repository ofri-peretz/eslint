# Rule corpus — `node-security/require-dependency-integrity` (CWE-494)

Written from CWE-494 semantics and real Node idiom, **not** from the rule's own
test file. The point is independent evidence: a corpus derived from the tests
can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

The sink family is **HTML emitted from JavaScript**: a `<script src>` or
`<link href>` pointing at a third-party CDN with no Subresource Integrity hash,
inside a string literal or template literal in a Node file (an Express handler,
an SSR shell, an email layout, a build script). The rule is measurable by the
duel harness because the markup lives in JS/TS string nodes.

## Fixtures

### `vulnerable/` — 10

Wave 1 — the plain forms:

| File | Shape |
|---|---|
| `01-express-html-shell.js` | Express route serving a jsDelivr `<script>` |
| `02-unpkg-string-literal.js` | the tag in a single-quoted string, concatenated |
| `03-cdnjs-stylesheet-link.js` | `<link rel="stylesheet">` from cdnjs |
| `04-mixed-protected-and-unprotected.js` | two hashed tags beside three unhashed (the Shopify/cli shape) |
| `05-escaped-script-tag.js` | `'\x3Cscript src="https://cdn.segment.com/…"'` |
| `06-crossorigin-without-integrity.js` | partial mitigation — `crossorigin`, no hash |
| `07-ssr-shell.ts` | typed SSR shell (TypeScript) |

Wave 2 — adversarial, written after wave 1 scored 100%:

| File | Attack |
|---|---|
| `08-cdn-host-in-variable.js` | the CDN host arrives through a `const` |
| `09-data-integrity-attribute.js` | a half-migrated pipeline stamping `data-integrity` |
| `10-attribute-containing-gt.js` | a CDN retry handler whose value contains `>` |

### `safe/` — 9

| File | Shape |
|---|---|
| `01-integrity-on-every-tag.js` | the remediation — a hash on every CDN tag |
| `02-self-hosted-bundle.js` | the other remediation — vendored, same-origin assets |
| `03-inline-script-no-src.js` | inline `<script>` / `<style>` — nothing is fetched |
| `04-cdn-url-not-a-tag.js` | a CDN URL in `fetch` and in an `<img>` |
| `05-first-party-origin-tags.js` | tags on first-party hosts |
| `06-integrity-single-quoted-attributes.js` | the hash, single-quoted, attributes reordered |
| `07-preconnect-and-dns-prefetch.js` | `rel="preconnect"` / `rel="dns-prefetch"` |
| `08-local-asset-named-cdn.js` | `/assets/cdn.fallback.js` — a same-origin file named `cdn.*` |
| `09-icon-and-manifest-links.js` | `rel="icon"` / `manifest` / `canonical` / `alternate` |

## Scores

| Wave | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---:|---:|---:|
| Wave 1 only (7 vuln / 6 safe) | 7 | 0 | 0 | 100.0% | 100.0% | **100.0%** |
| + adversarial wave, before fix | 7 | 3 | 3 | 70.0% | 70.0% | **70.0%** |
| after fix | 10 | 0 | 0 | 100.0% | 100.0% | **100.0%** |

## What this corpus proved

Six defects, one root cause: the rule decided from **substrings of the tag
text** rather than from the tag's attributes and the URL's host. All six are
fixed in `src/rules/require-dependency-integrity/index.ts`.

**Three false negatives** — each the same markup as a case the rule already
reported, spelled the way real templates spell it:

1. **The host in a `const`.** The `TemplateLiteral` arm scanned
   `context.sourceCode.getText(node)`, so `` `<script src="${CDN_BASE}/x.js">` ``
   read as the literal characters `${CDN_BASE}` and matched no known host. The
   emitted markup was byte-for-byte fixture 01. Fixed by rendering the template:
   quasis plus each expression resolved through `resolveConstantString`, with an
   unresolvable expression becoming NUL — a character no URL, host or attribute
   name can contain, so an unknown segment can only prevent a match, never
   complete one.
2. **`data-integrity="…"`.** `tag.includes('integrity=')` was satisfied by a
   build-pipeline bookkeeping attribute the browser ignores entirely, so a
   half-finished SRI migration silenced the very finding that would have flagged
   it as half-finished. Fixed by parsing attributes and asking
   `attributes.has('integrity')`.
3. **A `>` inside a quoted attribute value.** `RESOURCE_TAG` was
   `/<(script|link)\b[^>]*>/`, so a CDN retry handler
   (`onerror="if (tries > 0) retry()"`) split the tag at that `>` and left the
   `src` in the discarded half — an unprotected CDN script hideable behind any
   attribute containing a comparison. Fixed with a tag body that steps over
   quoted values. The three alternatives start with different characters, so the
   scan stays linear: this regex runs over every string literal in a user's
   codebase and an ambiguous alternation is the classic ReDoS shape.

**Three false positives**, all of the expensive kind — markup with **no
remediation available**, so a reader cannot make the report go away:

4. `rel="preconnect"` / `rel="dns-prefetch"` open a connection and resolve a
   name; they fetch no bytes, so there is nothing for a hash to describe. Both
   lines are in every performance guide ever written.
5. `rel="icon"`, `manifest`, `canonical`, `alternate` are destinations SRI does
   not cover — the spec defines integrity metadata for script and style only,
   and a browser ignores `integrity` on these.
6. `/assets/cdn.fallback.js` and `/js/app.js?variant=cdn.disabled` are
   same-origin files this application serves itself; the fragment `cdn.` was
   matched against the whole TAG rather than against the URL's host.

Fixed by (a) testing the CDN fragments against `hostOf(src|href)`, which
returns `undefined` for a relative URL, and (b) a `linkTakesIntegrity` check
over the `rel` tokens.

`linkTakesIntegrity` is deliberately **asymmetric**: an excluded relation is
positive evidence that no hash belongs there, so the rule abstains — but a
MISSING `rel` is no evidence at all, and treating absence as exclusion would let
one omitted attribute suppress the finding. Two pre-existing tests
(`<link href="https://cdnjs…/style.css">`, no `rel`) depend on this and still
pass; a strict reading would have turned them into false negatives.
