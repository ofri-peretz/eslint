// Model of eslint-plugin-browser-security/require-csp-headers (CWE-1021 / CWE-693).
// A response emission that sends an HTML DOCUMENT (res.send(<doctype or
// <html> string>), or <receiver>.render(view) where <receiver> is in
// responseReceivers) reports. A markup FRAGMENT (res.send('<div>…</div>')) is
// a partial for a page whose policy was set by whatever served that page, so
// it does not (the rule's documented design; the doc now says "document").
// unless a Content-Security-Policy is configured: helmet() applied in the file
// (not merely imported, not with contentSecurityPolicy: false),
// or the header set on that response. Setting OTHER headers
// (X-Frame-Options) is not a CSP: no-missing-security-headers, which that case
// was once deferred to, is deprecated, so this rule reports it. JSON /
// plain-text sends and template
// engines' render() (they return a string) never report. responseReceivers
// REPLACES the default list. Test files are always skipped.
module require_csp_headers {
  type Call =
    | ResSendDoc
    | ResSendFragment
    | ResSendJson
    | ResSendPlain
    | ResRender
    | ResponseRender
    | ReplyRender
    | EngineRender
    | CustomRecvRender
  type Helmet = NoHelmet | HelmetImportOnly | HelmetUse | HelmetCspDisabled
  type Csp = NoCsp | SetHeaderCsp | SetCsp | SetHeaderOther

  pure def emitsHtml(c: Call, customRecv: bool): bool = match c {
    | ResSendDoc => true
    | ResRender => true
    | ResponseRender => true
    | ReplyRender => true
    | CustomRecvRender => customRecv
    | _ => false
  }

  // Only helmet() APPLIED with its CSP on configures a policy; importing
  // helmet, or app.use(helmet({ contentSecurityPolicy: false })), does not.
  pure def hasCsp(h: Helmet, p: Csp): bool = h == HelmetUse or match p {
    | SetHeaderCsp => true
    | SetCsp => true
    | _ => false
  }

  pure def reports(c: Call, h: Helmet, p: Csp, testFile: bool, customRecv: bool): bool =
    not(testFile) and emitsHtml(c, customRecv) and not(hasCsp(h, p))

  var call: Call
  var helmet: Helmet
  var csp: Csp
  var testFile: bool
  var customRecv: bool
  var verdict: bool

  action step = {
    nondet c = Set(ResSendDoc, ResSendFragment, ResSendJson, ResSendPlain, ResRender, ResponseRender, ReplyRender, EngineRender, CustomRecvRender).oneOf()
    nondet h = Set(NoHelmet, HelmetImportOnly, HelmetUse, HelmetCspDisabled).oneOf()
    nondet p = Set(NoCsp, SetHeaderCsp, SetCsp, SetHeaderOther).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet r = Set(true, false).oneOf()
    all { call' = c, helmet' = h, csp' = p, testFile' = t, customRecv' = r, verdict' = reports(c, h, p, t, r) }
  }

  action init = step
}
