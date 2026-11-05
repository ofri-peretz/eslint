// Model of eslint-plugin-operability/no-console-log (CWE-532).
// Ad-hoc console output in shipped code bypasses structured logging and can
// leak data. The rule reports a call `<source>.<method>(...)` where:
//   - `<source>` is one of `sourcePatterns` (default ['console']); `console`
//     is the GLOBAL console, by binding - a parameter or local named
//     `console` is not it; other configured names match as configured;
//   - `<method>` is a key of the effective severity map: `log` by default,
//     plus every key of `severityMap` (`{ debug: 'verbose' }` adds `debug`);
//   - written dotted or as a string subscript (`console['log']`).
// A file is skipped when `ignorePaths` names it (exact, directory prefix or
// glob) or when it sits under a directory that never ships (`scripts/`, ...)
// while `ignoreNonProductionPaths` is true (the default). `strategy`,
// `loggerName`, `autoDetectLogger` and `maxOccurrences` shape the message and
// fix, never whether a file with a matching call reports (maxOccurrences
// caps the count, and the first call always reports).
// An aliased console (`const { log } = console`) is a documented known false
// negative and is left out.
module no_console_log {
  type Focus = Spellings | Methods | Sources | Paths | Shaping
  type Call = ConsoleLog | ConsoleLogSubscript | ConsoleDebug | ConsoleError | ShadowedConsoleLog | OldLoggerLog | LoggerDebug
  type MethodOpt = DefaultMap | DebugMapped
  type SourceOpt = DefaultSources | WithOldLogger
  type Path = Shipped | Script | Legacy
  type PathOpt = DefaultPaths | IgnoreLegacy | NonProdOff
  type Shape = DefaultShape | Convert | MaxOne

  pure def methodOn(c: Call, m: MethodOpt): bool =
    if (Set(ConsoleDebug, LoggerDebug).contains(c)) m == DebugMapped
    else c != ConsoleError
  pure def sourceOn(c: Call, so: SourceOpt): bool =
    if (c == OldLoggerLog) so == WithOldLogger
    else Set(ConsoleLog, ConsoleLogSubscript, ConsoleDebug, ConsoleError).contains(c)
  pure def skipped(p: Path, po: PathOpt): bool =
    (p == Legacy and po == IgnoreLegacy) or (p == Script and po != NonProdOff)
  pure def reports(c: Call, m: MethodOpt, so: SourceOpt, p: Path, po: PathOpt): bool =
    sourceOn(c, so) and methodOn(c, m) and not(skipped(p, po))

  var focus: Focus
  var call: Call
  var methodOpt: MethodOpt
  var sourceOpt: SourceOpt
  var path: Path
  var pathOpt: PathOpt
  var shape: Shape
  var verdict: bool

  action step = {
    nondet fo = Set(Spellings, Methods, Sources, Paths, Shaping).oneOf()
    nondet c = (if (fo == Spellings) Set(ConsoleLog, ConsoleLogSubscript, ShadowedConsoleLog, ConsoleError)
                else if (fo == Methods) Set(ConsoleLog, ConsoleDebug, ConsoleError, LoggerDebug)
                else if (fo == Sources) Set(ConsoleLog, OldLoggerLog, LoggerDebug)
                else Set(ConsoleLog)).oneOf()
    nondet m = (if (fo == Methods) Set(DefaultMap, DebugMapped) else Set(DefaultMap)).oneOf()
    nondet so = (if (fo == Sources) Set(DefaultSources, WithOldLogger) else Set(DefaultSources)).oneOf()
    nondet p = (if (fo == Paths) Set(Shipped, Script, Legacy) else Set(Shipped)).oneOf()
    nondet po = (if (fo == Paths) Set(DefaultPaths, IgnoreLegacy, NonProdOff) else Set(DefaultPaths)).oneOf()
    nondet sh = (if (fo == Shaping) Set(DefaultShape, Convert, MaxOne) else Set(DefaultShape)).oneOf()
    all { focus' = fo, call' = c, methodOpt' = m, sourceOpt' = so, path' = p, pathOpt' = po,
          shape' = sh, verdict' = reports(c, m, so, p, po) }
  }

  action init = step
}
