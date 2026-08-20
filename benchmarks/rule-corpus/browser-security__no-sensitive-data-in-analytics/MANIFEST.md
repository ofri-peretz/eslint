# Rule corpus — `browser-security/no-sensitive-data-in-analytics` (CWE-359)

Written from CWE-359 semantics and real analytics idiom — a Segment wrapper, a
`gtag` event, a GTM `dataLayer.push`, a PostHog capture — **not** from the
rule's own test file.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## What "vulnerable" means here

A PII field in a payload that leaves the origin for a third-party vendor. The
sink is matched by exact membership against a closed set of vendor APIs; the
FIELD is matched by whole word, because the payload key is genuinely the only
evidence there is — no binding resolution can tell you more about
`{ email: x }` than the key does.

What that does NOT license is substring matching. `key.includes('phone')`
reported `{ microphoneEnabled: true }` and `key.includes('address')` reported
`{ addressBarHidden: true }`; `safe/06` pins the first. The second is a known
LIMIT of word boundaries — `addressBarHidden` contains `address` as a genuine
word — and the escape hatch is the `sensitiveFields` option, which is why this
rule now has one.

## Partition

COMPLEMENTARY to `no-tracking-without-consent`, not duplicate. That rule asks
whether the call is REACHED without consent; this one asks what is IN it. Both
single-owner cells of the 2×2 are populated — see
`analytics-partition.matrix.test.ts`.
