# Rule corpus — `browser-security/no-unescaped-url-parameter` (CWE-79 / CWE-116)

Written from the semantics of *improper encoding* — untrusted text landing in a
URL's path, query or fragment without being escaped — and **not** from the rule's
own tests. It could not have been: the rule's tests asserted the defect. A
template interpolating `const PARAM = 'static'` was an INVALID case there.

## Why this corpus exists in this shape

The rule was wrong in BOTH directions at once, and both were reproduced with
`scripts/probe-rule.mts` before a line was changed:

| shape | old verdict | why |
| --- | --- | --- |
| `` `…?price=${input.toFixed(2)}` `` | REPORTED | `input` appeared in the printed source |
| `const PARAM = 'static'` in a query | REPORTED | `PARAM` matched a case-insensitive word test |
| `new URLSearchParams(location.search).get('q')` | silent | every call was opaque |
| `document.getElementById('q').value` | silent | no DOM source was modelled |
| a parameter of an exported function | silent | no reachability was modelled |

So `safe/` opens with the two false positives and `vulnerable/` opens with the
three false negatives. Fixtures 01–15 of each are that first wave.

## Wave 2 — the adversarial wave

Every rule in this repo that scored 100% on its first wave has fallen to a second
one written specifically against it, and this rule was no exception: wave 2 took
it from **100% F1 to 87.8%** — three misses and two false positives.

- `vulnerable/16–21` attack the *proofs*: a computed key (`location['search']`),
  a React `ref.current`, `getAll(…).join(',')`, a NodeList index, an
  `export default` handler, and a two-hop alias.
- `safe/16–24` attack the *widening*: a destructured `origin` off a parsed URL,
  `page + 1`, a `'asc' | 'desc'` parameter, a shadowed `document`, a local class
  named `FormData`, `location.protocol`/`.host` in a query position, `.join` on
  an array the module wrote, and an untrusted operand in the AUTHORITY of a `+`
  chain rather than a template.

`safe/16-destructured-origin.js` is the fixture that matters most: it is a false
positive the *fix itself* introduced. Teaching the taint helper that
`new URL(location.href)` is a container made `const { origin } = …` resolve to
that container, and the one same-origin property became a finding — in this rule
and in `no-insecure-redirects` at the same time.

## The partition line

`safe/05-authority-position.js` and `safe/24-concat-authority-operand.js` are not
safe code. They are *not this rule's finding*: an interpolation that chooses the
scheme or host is an open redirect (CWE-601), owned by `no-insecure-redirects`
and `require-url-validation`. Scoring them as safe here is the only honest way to
measure a partitioned family — the alternative is two rules reporting one line
under two CWEs, which this family has already fixed once.

Each fixture is one file, one shape, with the rationale in a header comment.
