// Model of eslint-plugin-lambda-security/no-permissive-cors-response (CWE-942).
// A Lambda proxy response (an object literal with statusCode or body) whose
// headers allow every origin — `Access-Control-Allow-Origin: '*'`, however
// the header name is cased or keyed, in `headers` or API Gateway v1's
// `multiValueHeaders` — is reported, wherever the response is written:
// returned, an arrow's implicit return, built in a variable, handed to the
// Lambda callback, or returned by a response factory. A specific origin, one
// from configuration, or a validated request origin is fine. An object that is
// not a response (fetch options) is not this rule. Only in Lambda files.
// Narrowed: headers from a variable or a spread are documented false negatives.
// `allowInTests` (default true) exempts test files.
module no_permissive_cors_response {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Value = Star | StarTemplate | Specific | FromEnv | Validated
  type Key = Canonical | Lower | Computed | MultiValue
  type Loc = Return | ArrowImplicit | ResponseVar | Callback | Factory | FetchOptions
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Values | Keys | Locs | Gates

  pure def reports(v: Value, l: Loc, g: Gate): bool =
    (v == Star or v == StarTemplate) and l != FetchOptions and g != NoEvidence

  var focus: Focus
  var value: Value
  var key: Key
  var loc: Loc
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Values, Keys, Locs, Gates).oneOf()
    nondet v = (if (fo == Values) Set(Star, StarTemplate, Specific, FromEnv, Validated)
                else Set(Star, Specific)).oneOf()
    nondet k = (if (fo == Keys) Set(Canonical, Lower, Computed, MultiValue) else Set(Canonical)).oneOf()
    nondet l = (if (fo == Locs) Set(Return, ArrowImplicit, ResponseVar, Callback, Factory, FetchOptions)
                else Set(Return)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, value' = v, key' = k, loc' = l, gate' = g, testCtx' = tc,
          verdict' = (reports(v, l, g) and not(exempt(tc))) }
  }

  action init = step
}
