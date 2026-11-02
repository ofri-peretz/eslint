// Model of eslint-plugin-browser-security/require-url-validation (CWE-601).
// This rule owns the navigations that do NOT write the current document's
// Location: window.open(x) (a new browsing context) and router.push(x) on a
// router resolved to a routing package's useRouter(). It reports when x is
// attacker-steerable (read from the inbound URL, e.g. a query parameter) and
// unvalidated. Every write to window.location / location.href is owned by
// no-insecure-redirects (the documented partition; the doc now says so), and
// a plain parameter is not proven taint, so neither reports here. A literal,
// or a value validated against an allowlist in an enclosing if, does not.
module require_url_validation {
  type Sink = WindowLocHref | LocHref | WindowLoc | WindowOpen | RouterPush
  type Arg = Variable | Tainted | Literal | AllowlistGuarded

  pure def ownsSink(s: Sink): bool = s == WindowOpen or s == RouterPush

  pure def reports(s: Sink, a: Arg): bool = ownsSink(s) and a == Tainted

  var sink: Sink
  var arg: Arg
  var verdict: bool

  action step = {
    nondet s = Set(WindowLocHref, LocHref, WindowLoc, WindowOpen, RouterPush).oneOf()
    nondet a = Set(Variable, Tainted, Literal, AllowlistGuarded).oneOf()
    all { sink' = s, arg' = a, verdict' = reports(s, a) }
  }

  action init = step
}
