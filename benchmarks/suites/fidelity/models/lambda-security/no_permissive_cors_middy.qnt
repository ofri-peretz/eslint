// Model of eslint-plugin-lambda-security/no-permissive-cors-middy (CWE-942).
// The `@middy/http-cors` middleware configured to let any website call the
// API is reported: `origin: '*'` (string, template or computed key),
// `origins: ['*']`, '*' combined with `credentials: true` (middy then reflects
// the caller's origin), or `cors()` with no options, which the docs say
// defaults to '*'. A specific origin, a list of them, a `*.example.com`
// subdomain pattern, or an origin from configuration is fine. However the
// middleware is imported (default name, renamed, required) and however it is
// mounted on middy (`.use(cors())`, `.use([…, cors()])`, a separate
// `handler.use(...)`, the v5 `middy().use(...).handler(fn)` chain). A `cors`
// function that is NOT `@middy/http-cors` is not this rule.
// Narrowed: an options object without any origin is not modelled (whether it
// defaults to '*' depends on the middy major).
// `allowInTests` (default true) exempts test files.
module no_permissive_cors_middy {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Origin = Star | StarTemplate | StarComputed | StarArray | StarWithCreds | NoArgs
              | Specific | SpecificList | Subdomain | FromEnv
  type Import = DefaultCors | DefaultHttpCors | Renamed | Required | Lookalike
  type Mount = UseCall | UseArray | Separate | HandlerChain
  type Focus = Origins | Imports | Mounts

  pure def permissive(o: Origin): bool =
    Set(Star, StarTemplate, StarComputed, StarArray, StarWithCreds, NoArgs).contains(o)
  pure def reports(o: Origin, i: Import): bool = permissive(o) and i != Lookalike

  var focus: Focus
  var origin: Origin
  var imp: Import
  var mount: Mount
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Origins, Imports, Mounts).oneOf()
    nondet o = (if (fo == Origins)
                  Set(Star, StarTemplate, StarComputed, StarArray, StarWithCreds, NoArgs,
                      Specific, SpecificList, Subdomain, FromEnv)
                else Set(Star, Specific)).oneOf()
    nondet i = (if (fo == Imports) Set(DefaultCors, DefaultHttpCors, Renamed, Required, Lookalike)
                else Set(DefaultCors)).oneOf()
    nondet m = (if (fo == Mounts) Set(UseCall, UseArray, Separate, HandlerChain)
                else Set(UseCall)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, origin' = o, imp' = i, mount' = m, testCtx' = tc,
          verdict' = (reports(o, i) and not(exempt(tc))) }
  }

  action init = step
}
