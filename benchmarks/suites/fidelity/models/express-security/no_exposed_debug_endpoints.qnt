// Model of eslint-plugin-express-security/no-exposed-debug-endpoints (CWE-489).
// A route REGISTRATION (app/router .get/.post/.use/.delete/.all, a chained
// app.route(path)) whose literal path is a sensitive path — or a sub-path of
// one — is reported. Defaults: /debug, /__debug__, /admin, /_admin, /test,
// /health. `endpoints` replaces the list. A literal elsewhere (constant,
// redirect, one-argument app.get settings read) is not an endpoint. Express
// matches paths case-insensitively, so '/Admin' serves /admin. `ignoreFiles`
// skips matching files.
module no_exposed_debug_endpoints {
  type Path = Debug | DebugSub | DebugTrailing | DunderDebug | Admin | AdminParam | AdminUpper
            | TestReset | Health | ApiProfile | StatusCheck | CustomMonitor
  type Reg = AppGet | AppPost | RouterUse | AppDelete | AppAll | RouteChain | NamedRouter
           | SettingsRead | Redirect | ConstDecl
  type File = PlainFile | IgnoredWithOpt | IgnoredNoOpt
  type Focus = Paths | Regs | Files

  pure def sensitive(p: Path, custom: bool): bool =
    if (custom) p == CustomMonitor
    else p != ApiProfile and p != StatusCheck and p != CustomMonitor
  pure def registers(r: Reg): bool = r != SettingsRead and r != Redirect and r != ConstDecl
  pure def reports(p: Path, r: Reg, custom: bool, f: File): bool =
    registers(r) and sensitive(p, custom) and f != IgnoredWithOpt

  var focus: Focus
  var path: Path
  var reg: Reg
  var custom: bool
  var file: File
  var verdict: bool

  action step = {
    nondet fo = Set(Paths, Regs, Files).oneOf()
    nondet p = (if (fo == Paths)
                  Set(Debug, DebugSub, DebugTrailing, DunderDebug, Admin, AdminParam, AdminUpper,
                      TestReset, Health, ApiProfile, StatusCheck, CustomMonitor)
                else if (fo == Regs) Set(Admin, ApiProfile) else Set(Debug)).oneOf()
    nondet r = (if (fo == Regs)
                  Set(AppGet, AppPost, RouterUse, AppDelete, AppAll, RouteChain, NamedRouter,
                      SettingsRead, Redirect, ConstDecl)
                else Set(AppGet)).oneOf()
    nondet c = (if (fo == Paths) Set(true, false) else Set(false)).oneOf()
    nondet f = (if (fo == Files) Set(PlainFile, IgnoredWithOpt, IgnoredNoOpt) else Set(PlainFile)).oneOf()
    all { focus' = fo, path' = p, reg' = r, custom' = c, file' = f,
          verdict' = reports(p, r, c, f) }
  }

  action init = step
}
