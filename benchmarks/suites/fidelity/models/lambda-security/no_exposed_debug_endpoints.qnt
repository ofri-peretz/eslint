// Model of eslint-plugin-lambda-security/no-exposed-debug-endpoints (CWE-489).
// A Lambda that ROUTES on a debug/admin path exposes it: comparing the
// request's path (API Gateway v1 `path`/`resource`, v2 `rawPath`/`routeKey`,
// `requestContext.http.path`, however the property is spelled or read) to the
// path, a `switch` case on it, or a Serverless Framework `http`/`httpApi`
// event declaring it (serverless.ts, with or without a leading slash).
// Default paths: /debug, /__debug__, /admin, /_admin, /test, /health, and
// their sub-paths (/admin/users). A path that merely starts with the same
// letters (/latest, /testimonials) is a different route. `endpoints` replaces
// the list. `ignoreFiles` skips matching files. Only in Lambda files.
// Narrowed: a debug-path literal that is not a route (a constant, a redirect)
// is not modelled.
module no_exposed_debug_endpoints {
  type Path = Debug | DunderDebug | Admin | UnderAdmin | Test | Health | DebugSub | AdminSub
            | Latest | Testimonials | Profile | Custom
  type Access = PathEq | RawPath | Resource | RouteKey | HttpPath | Bracket | Destructured
              | Reversed | SwitchCase | SlsHttp | SlsHttpApi | SlsNoSlash | SlsTs
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type File = PlainFile | IgnoredWithOpt | IgnoredNoOpt
  type Focus = Paths | Accesses | Gates | Files

  pure def sensitive(p: Path, custom: bool): bool =
    if (custom) p == Custom
    else Set(Debug, DunderDebug, Admin, UnderAdmin, Test, Health, DebugSub, AdminSub).contains(p)
  pure def reports(p: Path, custom: bool, g: Gate, f: File): bool =
    sensitive(p, custom) and g != NoEvidence and f != IgnoredWithOpt

  var focus: Focus
  var path: Path
  var access: Access
  var custom: bool
  var gate: Gate
  var file: File
  var verdict: bool

  action step = {
    nondet fo = Set(Paths, Accesses, Gates, Files).oneOf()
    nondet p = (if (fo == Paths)
                  Set(Debug, DunderDebug, Admin, UnderAdmin, Test, Health, DebugSub, AdminSub,
                      Latest, Testimonials, Profile, Custom)
                else if (fo == Accesses) Set(Admin, AdminSub, Latest)
                else if (fo == Gates) Set(Admin, Profile)
                else Set(Debug)).oneOf()
    nondet a = (if (fo == Accesses)
                  Set(PathEq, RawPath, Resource, RouteKey, HttpPath, Bracket, Destructured,
                      Reversed, SwitchCase, SlsHttp, SlsHttpApi, SlsNoSlash, SlsTs)
                else Set(RawPath)).oneOf()
    nondet c = (if (fo == Paths) Set(true, false) else Set(false)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet f = (if (fo == Files) Set(PlainFile, IgnoredWithOpt, IgnoredNoOpt) else Set(PlainFile)).oneOf()
    all { focus' = fo, path' = p, access' = a, custom' = c, gate' = g, file' = f,
          verdict' = reports(p, c, g, f) }
  }

  action init = step
}
