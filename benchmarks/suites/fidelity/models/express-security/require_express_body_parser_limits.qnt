// Model of eslint-plugin-express-security/require-express-body-parser-limits (CWE-400).
// A body parser (express.json/urlencoded/raw/text, the body-parser package,
// the package under another local name, a destructured `json` import) is reported when it sets an EXPLICIT limit
// above maxLimit (default 5 MiB), whether written as a size string (any
// case) or a byte count. Omitting options or the limit key leaves the
// documented 100kb default and is not reported; a limit exactly at maxLimit
// is not reported. A limit listed in excessiveLimits is reported as well.
// Options: MaxRaised = { maxLimit: 20 MiB } (8mb no longer reported, 50mb
// still is); Excessive2mb = { excessiveLimits: ['2mb'] } (2mb reported).
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

  // Size in KiB, explicit limits only (0 = no explicit limit).
  pure def kib(l: Limit): int = match l {
    | NoOpts => 0 | NoLimitKey => 0 | Kb100 => 100 | Mb1 => 1024 | Mb2 => 2048
    | Mb5 => 5120 | Mb8 => 8192 | Mb50 => 51200 | Mb50Upper => 51200 | Gb1 => 1048576
    | Num1mb => 1024 | Num50mb => 51200
  }
  pure def maxKib(o: Opts): int = if (o == MaxRaised) 20480 else 5120

  pure def reports(l: Limit, o: Opts): bool =
    kib(l) > maxKib(o) or (o == Excessive2mb and l == Mb2)

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
