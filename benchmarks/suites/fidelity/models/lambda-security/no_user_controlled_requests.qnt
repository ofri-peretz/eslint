// Model of eslint-plugin-lambda-security/no-user-controlled-requests (CWE-918).
// An outbound HTTP request whose URL comes from the Lambda event is SSRF and
// is reported: a query/path parameter or header read directly, destructured,
// or a field of the JSON-parsed body (the docs' own `JSON.parse(event.body)`
// then `fetch(body.webhookUrl)`), used as the URL or interpolated into it,
// through fetch, axios (call, method, `{ url }` config), got or https.get. A
// fixed or configured URL is fine; so is a user value sent as request DATA to
// a fixed URL, a user value that never reaches an HTTP client, and the docs'
// validated form (parse with `new URL`, check the host against an allowlist,
// then fetch). Only in Lambda files. `allowInTests` (default true) exempts
// test files.
module no_user_controlled_requests {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Source = QueryDirect | QueryDestructured | PathParam | Header | BodyParsed
              | BodyDestructured | Constant | EnvUrl | AllowlistChecked
  type Sink = Fetch | AxiosGet | AxiosConfig | Got | HttpsGet | FetchTemplate | AxiosPostData | NotHttp
  type Gate = ExportConst | ExportsDot | ModuleExports | FnDecl | Renamed | Middy
            | SdkImport | SdkRequire | NoEvidence
  type Focus = Sources | Sinks | Gates

  pure def userControlled(s: Source): bool =
    Set(QueryDirect, QueryDestructured, PathParam, Header, BodyParsed, BodyDestructured).contains(s)
  pure def urlSink(k: Sink): bool = k != AxiosPostData and k != NotHttp
  pure def reports(s: Source, k: Sink, g: Gate): bool = userControlled(s) and urlSink(k) and g != NoEvidence

  var focus: Focus
  var source: Source
  var sink: Sink
  var gate: Gate
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Sources, Sinks, Gates).oneOf()
    nondet s = (if (fo == Sources)
                  Set(QueryDirect, QueryDestructured, PathParam, Header, BodyParsed,
                      BodyDestructured, Constant, EnvUrl, AllowlistChecked)
                else if (fo == Sinks) Set(QueryDirect, BodyParsed, Constant)
                else Set(QueryDirect)).oneOf()
    nondet k = (if (fo == Sinks)
                  Set(Fetch, AxiosGet, AxiosConfig, Got, HttpsGet, FetchTemplate, AxiosPostData, NotHttp)
                else Set(Fetch)).oneOf()
    nondet g = (if (fo == Gates)
                  Set(ExportConst, ExportsDot, ModuleExports, FnDecl, Renamed, Middy,
                      SdkImport, SdkRequire, NoEvidence)
                else Set(ExportConst)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, source' = s, sink' = k, gate' = g, testCtx' = tc,
          verdict' = (reports(s, k, g) and not(exempt(tc))) }
  }

  action init = step
}
