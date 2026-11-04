// Model of eslint-plugin-lambda-security/no-env-logging (CWE-532).
// Handing the whole `process.env` object to a logger writes every variable,
// secrets included, to CloudWatch: the object itself, JSON.stringify of it,
// Object.entries of it, or the object nested in / spread into a structured log
// payload. Logging one named variable (process.env.AWS_REGION) is the
// documented safe form; so is the list of names (Object.keys). A template
// literal or string concatenation of the object coerces it to
// "[object Object]" and prints nothing. Writing the object somewhere that is
// not a log is not this rule. Loggers: console.* and an `@aws-lambda-powertools`
// Logger. Only in Lambda files (handler export, (event, context) or an AWS
// import). `allowInTests` (default true) exempts test files.
module no_env_logging {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Arg = Direct | Stringify | StringifyIndent | Structured | Spread | Entries | Bracket
           | Template | Concat | SpecificVar | SafeSubset | TemplateVar | BracketVar | KeysOnly
  type Sink = ConsoleLog | ConsoleError | ConsoleInfo | ConsoleBracket | PowertoolsInfo
            | PowertoolsDebug | NotLog
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Args | Sinks | Gates

  pure def leaks(a: Arg): bool =
    Set(Direct, Stringify, StringifyIndent, Structured, Spread, Entries, Bracket).contains(a)
  pure def logs(s: Sink): bool = s != NotLog
  pure def lambda(g: Gate): bool = g != NoEvidence
  pure def reports(a: Arg, s: Sink, g: Gate): bool = leaks(a) and logs(s) and lambda(g)

  var focus: Focus
  var arg: Arg
  var sink: Sink
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Args, Sinks, Gates).oneOf()
    nondet a = (if (fo == Args)
                  Set(Direct, Stringify, StringifyIndent, Structured, Spread, Entries, Bracket,
                      Template, Concat, SpecificVar, SafeSubset, TemplateVar, BracketVar, KeysOnly)
                else Set(Direct, SpecificVar)).oneOf()
    nondet s = (if (fo == Sinks)
                  Set(ConsoleLog, ConsoleError, ConsoleInfo, ConsoleBracket, PowertoolsInfo,
                      PowertoolsDebug, NotLog)
                else Set(ConsoleLog)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, arg' = a, sink' = s, gate' = g, testCtx' = tc,
          verdict' = (reports(a, s, g) and not(exempt(tc))) }
  }

  action init = step
}
