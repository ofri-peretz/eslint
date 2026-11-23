// Model of eslint-plugin-express-security/require-express-body-parser-limits (CWE-400).
// A body parser (express.json/urlencoded/raw/text, the body-parser package,
// the package under another local name, a destructured `json` import) is
// reported when it sets NO `limit`: no options at all, or an options object
// with no `limit` key. ANY explicit limit, whatever its value or spelling (a
// size string in any case, or a byte count), is a deliberate choice and is
// never reported. `maxLimit` and `excessiveLimits` are accepted for
// compatibility and have no effect: MaxRaised and Excessive2mb must not
// change a verdict. Options the rule cannot read (a variable, a spread, a
// computed key) abstain and are not modelled here.
// Mounts: app.use, router.use, and a route-level parser in a POST chain.
module require_express_body_parser_limits {
  type TestCtx = Prod | TestDefault | TestFlip
  // allowInTests defaults to false: a test file is exempt only when flipped.
  pure def exempt(t: TestCtx): bool = t == TestFlip

  type Limit =
    | NoOpts | NoLimitKey | Kb100 | Mb1 | Mb2 | Mb5 | Mb8 | Mb50 | Mb50Upper | Gb1
    | Num1mb | Num50mb
  type Parser =
    | ExpressJson | ExpressUrlencoded | ExpressRaw | ExpressText
    | BodyParserJson | BodyParserUrlencoded | RequireBodyParser | RenamedBodyParser | DestructuredJson
    | RouterUse | RouteLevel
  type Opts = Default | MaxRaised | Excessive2mb

  // Is a limit written down at all? Only the two spellings with no `limit`
  // key are not; the size of an explicit one is irrelevant.
  pure def hasLimit(l: Limit): bool = match l {
    | NoOpts => false | NoLimitKey => false
    | _ => true
  }

  // The retired options never matter: the verdict ignores them.
  pure def reports(l: Limit, o: Opts): bool = not(hasLimit(l))

  pure val LIMITS = Set(NoOpts, NoLimitKey, Kb100, Mb1, Mb2, Mb5, Mb8, Mb50, Mb50Upper, Gb1, Num1mb, Num50mb)
  // Every parser spelling at default options; every option with express.json.
  pure val CORE = tuples(LIMITS, Set(ExpressJson, ExpressUrlencoded, ExpressRaw, ExpressText,
                                     BodyParserJson, BodyParserUrlencoded, RequireBodyParser, RenamedBodyParser,
                                     DestructuredJson, RouterUse, RouteLevel), Set(Default))
  pure val OPTS = tuples(LIMITS, Set(ExpressJson), Set(MaxRaised, Excessive2mb))

  var limit: Limit
  var parser: Parser
  var opts: Opts
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet i = CORE.union(OPTS).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      limit' = i._1, parser' = i._2, opts' = i._3, testCtx' = tc,
      verdict' = (reports(i._1, i._3) and not(exempt(tc))),
    }
  }

  action init = step
}
