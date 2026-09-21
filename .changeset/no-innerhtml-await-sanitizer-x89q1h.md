---
'eslint-plugin-browser-security': patch
---

fix: `no-innerhtml` reported a false positive on an awaited trusted sanitiser

`isSanitized()` only recognized a trusted sanitiser (from the `trustedSanitizers` allowlist, e.g. `DOMPurify.sanitize` or `sanitize`) when the value being judged was itself a `CallExpression`. `await sanitize(x)` is an `AwaitExpression` wrapping that call, so an async sanitiser wrapper — such as an async DOMPurify wrapper — still reported as unsanitized once a caller `await`ed it, even though the callee was on the default allowlist. `AwaitExpression` is now unwrapped the same way `ChainExpression` already is (for `DOMPurify?.sanitize(x)`), then the call underneath is judged. Reported in #1056.
