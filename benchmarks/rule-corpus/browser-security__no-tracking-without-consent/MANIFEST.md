# Rule corpus — `browser-security/no-tracking-without-consent` (CWE-359)

Written from GDPR/ePrivacy consent semantics and real cookie-banner idiom — a
`useEffect` that fires on mount, an early-return guard, a consent-manager
callback — **not** from the rule's own test file.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## What "vulnerable" means here

A tracking call REACHED on a path where consent was not granted. The branch is
the whole question: `if (!hasConsent) { analytics.track(…) }` is the defect,
not the fix, and the rule's own suite once pinned that exact shape as
acceptable because it treated any enclosing `if` as protection.

Consent has no API to bind to — it is a boolean the product decides on — so
this is a NAME test, and it is acceptable only because of its DIRECTION: it can
SILENCE a finding, never produce one. Getting the vocabulary wrong costs
recall, which is why `consentIdentifiers` is configurable.

## Partition

COMPLEMENTARY to `no-sensitive-data-in-analytics`. That rule asks what is IN
the payload; this one asks whether the call is reached at all. See
`analytics-partition.matrix.test.ts`.

## Known limit — `vulnerable/11` is a deliberate false negative

`if (shouldShowConsentBanner) { analytics.page('Consent Banner Shown'); }` is
not detected, and the fixture stays in `vulnerable/` rather than being deleted
to protect the score. The identifier contains `consent` as a whole word and
decides whether to RENDER the banner, not whether consent was given, and there
is no AST evidence that separates the two.

The DIRECTION is what makes that acceptable: this name test only ever
SILENCES, so getting it wrong costs recall rather than a stranger's trust —
the opposite of the substring defects fixed in `no-client-side-auth-logic` and
`no-sensitive-data-in-analytics`, which REPORTED on evidence they did not have.
`consentIdentifiers` is the escape hatch.
