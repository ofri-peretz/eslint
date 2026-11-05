// Model of eslint-plugin-operability/no-debug-code-in-production (CWE-489).
// Debug output left in shipped code leaks internal state. The rule reports a
// `console.log(...)` call on the global console (dotted or string subscript)
// in a file that ships. It does not report:
//   - a `console` the code binds itself (a parameter, an injected logger
//     named console) - it is not the global console;
//   - other loggers (`logger.log`) and other members of an object;
//   - a file under a directory that never ships (`scripts/`, `tools/`, ...)
//     while `ignoreNonProductionPaths` is true (the default).
// Left out: the `DEBUG` and `__DEV__` identifiers - the rule reports them by
// NAME, including a declaration (`const DEBUG = false`) and a `__DEV__` guard
// that the build strips from production: candidate for change (fires on a
// guess). An aliased console (`const log = console.log`) is a documented known
// false negative.
module no_debug_code_in_production {
  type Spelling = Global | Subscript | LocalShadow | LoggerLog | NoCall
  type Path = Shipped | Script

  pure def reports(s: Spelling, p: Path, ignoreNonProd: bool): bool =
    Set(Global, Subscript).contains(s) and not(p == Script and ignoreNonProd)

  var spelling: Spelling
  var path: Path
  var ignoreNonProductionPaths: bool
  var verdict: bool

  action step = {
    nondet s = Set(Global, Subscript, LocalShadow, LoggerLog, NoCall).oneOf()
    nondet p = Set(Shipped, Script).oneOf()
    nondet i = Set(true, false).oneOf()
    all { spelling' = s, path' = p, ignoreNonProductionPaths' = i, verdict' = reports(s, p, i) }
  }

  action init = step
}
