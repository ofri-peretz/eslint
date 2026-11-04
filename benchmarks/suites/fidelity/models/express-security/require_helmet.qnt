// Model of eslint-plugin-express-security/require-helmet (CWE-693).
// An Express app that renders documents to a browser (res.render, res.sendFile,
// app.set('view engine', …), app.engine(…)) must mount helmet. res.send and a
// pure static server are not document evidence. Helmet counts under any local
// binding name (default import renamed, require, inside a middleware array);
// an `alternativeMiddleware` name counts only when configured. The rule
// abstains when the app binding leaves the file (module.exports, export
// default, passed to a configurer) and under assumeHelmetMiddleware.
module require_helmet {
  // Test-file dimension (lib.cjs withTestFile): `allowInTests` defaults to
  // false, so a test file is exempt only when the option is turned on.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Evidence = NoDoc | Render | SendFile | ViewEngine | Engine | SendOnly | StaticOnly
  type Helmet =
    | NoHelmet
    | HelmetUse        // app.use(helmet())
    | HelmetRenamed    // import securityHeaders from 'helmet'; app.use(securityHeaders())
    | HelmetArray      // app.use([compression(), helmet()])
    | AltNamed         // app.use(secureHeaders()) with alternativeMiddleware: ['secureHeaders']
    | AltUnnamed       // app.use(secureHeaders()), option not set
  type Spelling = ImportDefault | Require | RenamedExpress | ServerName
  type Escape = Stays | CjsExport | EsmExport | PassedToFn

  pure def documents(e: Evidence): bool =
    e == Render or e == SendFile or e == ViewEngine or e == Engine
  pure def helmetSeen(h: Helmet): bool =
    h == HelmetUse or h == HelmetRenamed or h == HelmetArray or h == AltNamed

  pure def wide(e: Evidence, h: Helmet): bool =
    (e == Render or e == NoDoc) and (h == NoHelmet or h == HelmetUse)

  pure def reports(e: Evidence, h: Helmet, x: Escape, assumeHelmet: bool): bool =
    documents(e) and not(helmetSeen(h)) and x == Stays and not(assumeHelmet)

  var evidence: Evidence
  var helmet: Helmet
  var spelling: Spelling
  var escape: Escape
  var assumeHelmet: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet e = Set(NoDoc, Render, SendFile, ViewEngine, Engine, SendOnly, StaticOnly).oneOf()
    nondet h = Set(NoHelmet, HelmetUse, HelmetRenamed, HelmetArray, AltNamed, AltUnnamed).oneOf()
    // App spelling, escape and assume are crossed with one documented and one
    // non-document input, each with and without helmet.
    nondet sp = (if (wide(e, h)) Set(ImportDefault, Require, RenamedExpress, ServerName) else Set(ImportDefault)).oneOf()
    nondet x = (if (wide(e, h)) Set(Stays, CjsExport, EsmExport, PassedToFn) else Set(Stays)).oneOf()
    nondet a = (if (wide(e, h)) Set(true, false) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      evidence' = e, helmet' = h, spelling' = sp, escape' = x, assumeHelmet' = a, testCtx' = tc,
      verdict' = (reports(e, h, x, a) and not(exempt(tc))),
    }
  }

  action init = step
}
