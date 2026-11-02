// Model of eslint-plugin-node-security/no-ssrf (CWE-918).
// Contract (docs): an outbound HTTP request (fetch, axios, http/https.request or
// .get, got, node-fetch under any local name) is reported when its URL carries
// evidence of user flow: a read off req/request/ctx/event (directly, in an
// options object, in a template/concat, or via one destructuring hop). A URL
// built from plain locals/params is silent; a bare user-input-named identifier
// reports only under reportUnresolvedUrls. A host allowlist check before the
// request is the documented fix. A non-HTTP `.get` (a Map) is not a request.
module no_ssrf {
  // allowInTests (default true): a test file is skipped unless the option is turned
  // off. TestDefault = src/app.test.ts with the option at its default
  // (silent), TestFlip = the same file with allowInTests: false (reported as usual).
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault
  var testCtx: TestCtx
  type Client = Fetch | AxiosGet | HttpsRequestObj | HttpGet | GotCall
              | NodeFetchRenamed | MapGet
  type UrlSrc = Literal | ReqQuery | ReqTemplate | DestructuredReq | LocalTemplate
              | UserNamedParam | AllowlistGuard

  pure def evidence(u: UrlSrc, unresolvedOpt: bool): bool = match u {
    | Literal => false
    | ReqQuery => true
    | ReqTemplate => true
    | DestructuredReq => true
    | LocalTemplate => false
    | UserNamedParam => unresolvedOpt
    | AllowlistGuard => false
  }

  pure def reports(c: Client, u: UrlSrc, unresolvedOpt: bool): bool =
    c != MapGet and evidence(u, unresolvedOpt)

  var client: Client
  var urlSrc: UrlSrc
  var unresolvedOpt: bool
  var verdict: bool

  action step = {
    nondet c = Set(Fetch, AxiosGet, HttpsRequestObj, HttpGet, GotCall, NodeFetchRenamed, MapGet).oneOf()
    nondet u = Set(Literal, ReqQuery, ReqTemplate, DestructuredReq, LocalTemplate,
                   UserNamedParam, AllowlistGuard).oneOf()
    nondet o = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { client' = c, urlSrc' = u, unresolvedOpt' = o, testCtx' = tc, verdict' = (reports(c, u, o) and not(exempt(tc))) }
  }

  action init = step
}
