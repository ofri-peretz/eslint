// Model of eslint-plugin-express-security/no-graphql-introspection-production (CWE-200).
// new ApolloServer({ introspection: true }) is reported. `false`, an
// expression that is true only outside production (NODE_ENV !== 'production',
// === 'development') and an absent key (Apollo disables it in production) are
// safe; `NODE_ENV === 'production'` turns it on exactly in production. A value
// held in a variable is a documented false negative. Every Apollo package and
// import spelling counts in an Express app; the doc's own example imports only
// apollo-server-express (the Express integration), which is Express evidence.
// A standalone `apollo-server` file with no Express in it is out of this
// plugin's scope (not reported). With allowInDevelopment (default true) a server
// constructed inside a development-only branch is exempt.
// allowInTests defaults to true: a test file is exempt unless turned off.
module no_graphql_introspection_production {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Value = IntroTrue | IntroFalse | EnvNotProd | EnvIsDev | EnvIsProd | Absent | FromVariable
  type Import = WithExpress | ApolloExpressOnly | ApolloServer4 | Standalone | RenamedImport | RequireApollo
  type Guard = NoGuard | IfDev | IfProd
  type Focus = Values | Imports | Guards

  pure def enabledInProd(v: Value): bool = v == IntroTrue or v == EnvIsProd
  pure def reports(v: Value, i: Import, g: Guard, allowDev: bool): bool =
    i != Standalone and enabledInProd(v) and not(allowDev and g == IfDev)

  var focus: Focus
  var value: Value
  var imp: Import
  var guard: Guard
  var allowDev: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet f = Set(Values, Imports, Guards).oneOf()
    nondet v = (if (f == Values) Set(IntroTrue, IntroFalse, EnvNotProd, EnvIsDev, EnvIsProd, Absent, FromVariable)
                else if (f == Imports) Set(IntroTrue, IntroFalse) else Set(IntroTrue)).oneOf()
    nondet i = (if (f == Imports) Set(WithExpress, ApolloExpressOnly, ApolloServer4, Standalone, RenamedImport, RequireApollo)
                else Set(WithExpress)).oneOf()
    nondet g = (if (f == Guards) Set(NoGuard, IfDev, IfProd) else Set(NoGuard)).oneOf()
    nondet d = (if (f == Guards) Set(true, false) else Set(true)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = f, value' = v, imp' = i, guard' = g, allowDev' = d, testCtx' = tc,
          verdict' = (reports(v, i, g, d) and not(exempt(tc))) }
  }

  action init = step
}
