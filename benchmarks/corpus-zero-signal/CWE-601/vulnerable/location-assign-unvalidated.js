// CWE-601: navigation to an unvalidated URL
// @author      ofri-peretz
// @reviewedBy  benchmark-validator
// @lastReviewed 2026-08-16
// This MUST be detected by browser-security/require-url-validation
//
// Two things changed here, and both are the rule getting narrower on purpose.
//
// 1. The destination has a SOURCE. This used to be `window.location = userUrl`
//    with `userUrl` unbound, which only ever passed because the rule decided
//    from the shape of the target: every non-literal assignment reported. That
//    version was unsatisfiable — `if (isAllowedHost(url)) { window.location = url }`
//    reported identically to the unguarded write, so nothing short of hardcoding
//    the URL silenced it, and the safe fixture beside this one carried a standing
//    false positive to prove it. A rule a user cannot satisfy gets disabled.
//
// 2. The sink is `window.open`, not `window.location`. Writes to `window.location`
//    are now owned by `no-insecure-redirects` — verified: it reports this exact
//    source assigned to `window.location`, and it is the rule with the taint model
//    for it. Two rules reporting one navigation under one CWE was the duplication
//    the transport/URL partition removed. `window.open` opens a new browsing
//    context and is this rule's own territory.
const next = new URLSearchParams(window.location.search).get('next');
window.open(next, '_blank');
