# Rule corpus — `browser-security/no-unvalidated-deeplinks` (CWE-939)

Written from CWE-939 semantics and real React Native idiom — a cold-start
`Linking.getInitialURL()`, a warm `'url'` listener, a screen reading
`route.params` — **not** from the rule's own test file. A corpus derived from
the tests can only re-derive what the author already thought of.

Each fixture is one file, one shape, with the rationale in a header comment.
`vulnerable/` must be reported; `safe/` must stay quiet.

## What "vulnerable" means here

CWE-939 is *improper authorization of the inbound URL scheme*: the OS hands the
app a URL somebody outside it chose, and the app acts on it. What makes a
`Linking.openURL(x)` a finding is therefore where `x` CAME FROM, not that `x`
is spelled as a variable — `Linking.openURL(SUPPORT_URL)` is a hardcoded
support link and belongs in `safe/`.

`navigation.navigate(screenName)` is likewise not a deep link on its own:
Backbone's `router.navigate(fragment)` and React Navigation's screen names
cannot leave the origin. It becomes one when the target is externally chosen.

## Partition

`Linking.openURL` (the OS scheme handler) and `.navigate` (an in-app screen
target) are this rule's. Location writes belong to `no-insecure-redirects`,
`window.open` and framework routers to `require-url-validation`. See
`url-navigation-partition.matrix.test.ts`.
