// Model of eslint-plugin-express-security/no-permissive-trust-proxy (CWE-348).
// `trust proxy` set to true (or enabled) makes Express believe the whole
// X-Forwarded-For chain, so req.ip is client-chosen. Reported: set('trust
// proxy', true) in either member spelling, and enable('trust proxy'). Safe:
// a hop count, 'loopback', a subnet, a predicate, false, disable(), and
// unrelated settings. The receiver must read as an Express app by name:
// appReceiverNames (default app/server/router/express/api/apiRouter/routes)
// REPLACES the default list. hopCount only shapes the suggestion. No Express
// evidence in the file: no report.
module no_permissive_trust_proxy {
  type Call =
    | SetTrue | BracketSetTrue | Enable
    | SetOne | SetLoopback | SetSubnet | SetFn | SetFalse | Disable
    | OtherKeyTrue | EnableOther
  type Ctx =
    | App | Server | Router | Require
    | Gateway          // const gateway = express(): not a default receiver name
    | GatewayNamed     // appReceiverNames: ['gateway'], receiver gateway
    | AppNotNamed      // appReceiverNames: ['gateway'], receiver app
    | HopCount         // hopCount: 2
    | NoExpress        // no Express in the file

  pure def permissive(c: Call): bool = c == SetTrue or c == BracketSetTrue or c == Enable
  pure def receiverSeen(x: Ctx): bool = not(x == Gateway or x == AppNotNamed or x == NoExpress)

  var call: Call
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet c = Set(SetTrue, BracketSetTrue, Enable, SetOne, SetLoopback, SetSubnet, SetFn, SetFalse,
                   Disable, OtherKeyTrue, EnableOther).oneOf()
    nondet x = Set(App, Server, Router, Require, Gateway, GatewayNamed, AppNotNamed, HopCount, NoExpress).oneOf()
    all { call' = c, ctx' = x, verdict' = (permissive(c) and receiverSeen(x)) }
  }

  action init = step
}
