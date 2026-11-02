// Model of eslint-plugin-nestjs-security/no-permissive-cors (CWE-942).
// enableCors() accepting any origin is reported: no options, options without
// an origin key, origin '*', or the reflecting origin true. Anything not
// statically decidable (variable, member, template, array, regex, callback,
// imported options, spread without a visible origin, reassigned binding) is not.
// Either member spelling of `enableCors` is the call. A call in a branch that
// runs only outside production is not reported (see `devOnly`).
module no_permissive_cors {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to true,
  // so a test file is exempt unless the option is turned off.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Arg =
    | NoArg | EmptyObj | CredOnly
    | OriginStar | OriginTrue | OriginTrueCred | OriginFalse
    | OriginString | OriginArray | OriginMember | OriginCallback | OriginRegex | OriginTemplate
    | SpreadOnly          // { ...base }
    | SpreadThenStar      // { ...base, origin: '*' } — visible after the spread
    | ImportedOpts        // enableCors(corsOptions) imported
    | LocalStar           // const o = { origin: '*' }; enableCors(o)
    | LocalList           // const o = { origin: ['https://a'] }; enableCors(o)
    | LocalReassigned     // let o = { origin: '*' }; o = safe; enableCors(o)
  type Callee = Dot | Bracket
  // The branch the call sits in (docs: "Environment checks"). A branch that
  // runs only outside production exempts the call — when its condition
  // mentions an `environmentHintNames` word and, read in the branch's
  // direction, selects development.
  type Guard =
    | Unguarded
    | IfDev          // if (process.env.NODE_ENV === 'development') { call }
    | IfNotProd      // if (process.env.NODE_ENV !== 'production') { call }
    | IfProd         // if (process.env.NODE_ENV === 'production') { call }
    | ElseOfDev      // if (NODE_ENV === 'development') {} else { call } — production
    | ElseOfProd     // if (NODE_ENV === 'production') {} else { call } — development
    | AndIsDev       // isDev && call
    | StageLocal     // if (stage === 'local') { call } — `stage` is no default hint
    | NonEnvCond     // if (req.path.startsWith('/public')) { call }
  // Hints: the default list, or `['stage']`, which REPLACES the default.
  type Hints = DefaultHints | StageHints

  pure def reports(a: Arg): bool =
    a == NoArg or a == EmptyObj or a == CredOnly or a == OriginStar or a == OriginTrue
      or a == OriginTrueCred or a == SpreadThenStar or a == LocalStar

  pure def devOnly(g: Guard, h: Hints): bool = match g {
    | Unguarded => false
    | IfDev => h == DefaultHints
    | IfNotProd => h == DefaultHints
    | IfProd => false
    | ElseOfDev => false
    | ElseOfProd => h == DefaultHints
    | AndIsDev => h == DefaultHints
    | StageLocal => h == StageHints
    | NonEnvCond => false
  }

  var arg: Arg
  var callee: Callee
  var guard: Guard
  var hints: Hints
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet a = Set(NoArg, EmptyObj, CredOnly, OriginStar, OriginTrue, OriginTrueCred, OriginFalse,
                   OriginString, OriginArray, OriginMember, OriginCallback, OriginRegex, OriginTemplate,
                   SpreadOnly, SpreadThenStar, ImportedOpts, LocalStar, LocalList, LocalReassigned).oneOf()
    nondet c = Set(Dot, Bracket).oneOf()
    // The environment dimension is crossed with one reported and one safe
    // origin only; every other origin is sampled unguarded, default hints.
    nondet g = (if (a == OriginStar or a == OriginString)
                  Set(Unguarded, IfDev, IfNotProd, IfProd, ElseOfDev, ElseOfProd, AndIsDev, StageLocal, NonEnvCond)
                else Set(Unguarded)).oneOf()
    nondet h = (if (a == OriginStar or a == OriginString) Set(DefaultHints, StageHints)
                else Set(DefaultHints)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { arg' = a, callee' = c, guard' = g, hints' = h, testCtx' = tc, verdict' = (reports(a) and not(devOnly(g, h)) and not(exempt(tc))) }
  }

  action init = step
}
