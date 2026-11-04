// Model of eslint-plugin-express-security/no-permissive-cors (CWE-942).
// A `cors` middleware call that lets any origin read responses is reported:
// no options (the package default origin is '*'), origin '*', or the
// reflecting origin true. An explicit list, a fixed string, false, a
// validating callback or a config value is safe.
// Narrowed (judgment calls, documented): an options object with no `origin`
// key is not reported (the doc's flowchart: arguments present -> only '*' /
// true count), and a permissive origin WITH credentials: true belongs to
// no-cors-credentials-wildcard (rule partition), so it is not reported here.
// allowOriginTrue accepts origin: true; allowedOrigins lists origins the user
// accepts, so `allowedOrigins: ['*']` accepts the wildcard. The cors binding
// is whatever `cors` is imported as. No Express evidence in the file: no report.
module no_permissive_cors {
  type Arg =
    | NoArg | MethodsOnly | CredOnly
    | OriginStar | OriginTrue | OriginTrueCred
    | OriginFalse | OriginList | OriginString | OriginCallback | OriginEnv
  type Ctx =
    | DefImportUse     // import cors from 'cors'; app.use(cors(x))
    | DefRequireUse    // const cors = require('cors')
    | DefRenamed       // import corsMiddleware from 'cors'
    | DefRouterUse     // express.Router().use(cors(x))
    | DefRouteLevel    // app.get('/x', cors(x), handler)
    | DefArray         // app.use([cors(x), express.json()])
    | DefNoExpress     // the same call in a file with no Express in it
    | DefTestFile      // test file, allowInTests default (false)
    | FlipTestFile     // test file, allowInTests: true
    | CfgAllowTrue     // allowOriginTrue: true
    | CfgAllowedStar   // allowedOrigins: ['*']

  pure def permissive(a: Arg, x: Ctx): bool = match a {
    | NoArg => x != CfgAllowedStar
    | OriginStar => x != CfgAllowedStar
    | OriginTrue => x != CfgAllowTrue
    | _ => false
  }

  var arg: Arg
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet a = Set(NoArg, MethodsOnly, CredOnly, OriginStar, OriginTrue, OriginTrueCred,
                   OriginFalse, OriginList, OriginString, OriginCallback, OriginEnv).oneOf()
    nondet x = Set(DefImportUse, DefRequireUse, DefRenamed, DefRouterUse, DefRouteLevel, DefArray,
                   DefNoExpress, DefTestFile, FlipTestFile, CfgAllowTrue, CfgAllowedStar).oneOf()
    all {
      arg' = a, ctx' = x,
      verdict' = (permissive(a, x) and x != DefNoExpress and x != FlipTestFile),
    }
  }

  action init = step
}
