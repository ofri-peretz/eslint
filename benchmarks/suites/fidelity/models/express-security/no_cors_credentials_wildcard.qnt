// Model of eslint-plugin-express-security/no-cors-credentials-wildcard (CWE-942).
// cors({ credentials: true }) with a permissive origin — '*' or reflecting
// `true` — is reported, wherever the cors() middleware is mounted. An explicit
// origin (string, list, regex) is safe; a callback or env value is not
// statically decidable (documented false negatives).
// `allowInTests` (default false) exempts test files only when turned on.
module no_cors_credentials_wildcard {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Origin = Star | ReflectTrue | OriginString | OriginArray | OriginRegex | OriginCallback
              | OriginEnv | OriginFalse | NoOrigin
  type Cred = CredTrue | CredFalse | NoCred
  type Import = DefaultImport | RequireCors | RenamedImport
  type Mount = AppUse | RouterUse | RouteLevel | OptionsPreflight | MiddlewareArray

  // An absent origin is the cors package default, '*': judged separately below.
  pure def permissive(o: Origin): bool = o == Star or o == ReflectTrue
  pure def reports(o: Origin, c: Cred): bool = c == CredTrue and permissive(o)

  var origin: Origin
  var cred: Cred
  var imp: Import
  var mount: Mount
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet o = Set(Star, ReflectTrue, OriginString, OriginArray, OriginRegex, OriginCallback,
                   OriginEnv, OriginFalse, NoOrigin).oneOf()
    nondet c = Set(CredTrue, CredFalse, NoCred).oneOf()
    // Import and mount spellings are crossed with one unsafe and one safe config.
    nondet i = (if ((o == Star or o == OriginString) and c == CredTrue)
                  Set(DefaultImport, RequireCors, RenamedImport) else Set(DefaultImport)).oneOf()
    nondet m = (if ((o == Star or o == OriginString) and c == CredTrue)
                  Set(AppUse, RouterUse, RouteLevel, OptionsPreflight, MiddlewareArray)
                else Set(AppUse)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { origin' = o, cred' = c, imp' = i, mount' = m, testCtx' = tc,
          verdict' = (reports(o, c) and not(exempt(tc))) }
  }

  action init = step
}
