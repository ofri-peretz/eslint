// Model of eslint-plugin-express-security/require-case-insensitive-path-guard (CWE-178).
// Express routes match case-insensitively by default, so a guard comparing
// req.path / req.url / req.originalUrl case-sensitively against a protected
// value (startsWith, endsWith, includes, indexOf, match or RegExp#test
// without `i`, ===, !=,
// either operand order) is bypassed by /Admin. Safe: normalising with
// toLowerCase() (inline or via a const), a regex with the `i` flag, and a
// route registration. The value is protected when it contains one of
// protectedPaths (default admin/api/dashboard/internal/private; Prot =
// ['admin', 'billing']); checkAllPaths reports every case-sensitive guard.
// Where it runs: an app middleware, a router middleware, a require()d app, a
// middleware module typed with `import type` from express, or a plain
// exported (req, res, next) middleware with no Express import at all: the
// docs state no Express-evidence precondition, and a middleware module
// commonly imports nothing from express, so it is reported the same.
module require_case_insensitive_path_guard {
  type Guard =
    | StartsWith | EndsWith | Includes | IndexOf | Match | RegexTest | Eq | LooseNe | YodaEq
    | MatchI | TestI | LowerInline | LowerVar | Registration
  type Source = Path | Url | OriginalUrl
  type Value = Admin | Health | Billing
  type Opts = Default | Prot | CheckAll
  type Mount = App | Router | RequireApp | TypedModule | PlainModule

  pure def caseSensitive(g: Guard): bool =
    not(g == MatchI or g == TestI or g == LowerInline or g == LowerVar or g == Registration)
  pure def protectedValue(v: Value, o: Opts): bool =
    o == CheckAll or v == Admin or (v == Billing and o == Prot)

  var guard: Guard
  var source: Source
  var value: Value
  var opts: Opts
  var mount: Mount
  var verdict: bool

  action step = {
    nondet g = Set(StartsWith, EndsWith, Includes, IndexOf, Match, RegexTest, Eq, LooseNe, YodaEq,
                   MatchI, TestI, LowerInline, LowerVar, Registration).oneOf()
    nondet src = Set(Path, Url, OriginalUrl).oneOf()
    nondet v = Set(Admin, Health, Billing).oneOf()
    nondet o = Set(Default, Prot, CheckAll).oneOf()
    // The mount dimension is crossed with one guard spelling only.
    nondet m = (if (g == StartsWith and src == Path)
                  Set(App, Router, RequireApp, TypedModule, PlainModule)
                else Set(App)).oneOf()
    all { guard' = g, source' = src, value' = v, opts' = o, mount' = m,
          verdict' = (caseSensitive(g) and protectedValue(v, o)) }
  }

  action init = step
}
