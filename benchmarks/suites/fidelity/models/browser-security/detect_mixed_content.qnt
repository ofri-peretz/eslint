// Model of eslint-plugin-browser-security/detect-mixed-content (CWE-311).
// Contract (Rule Details): an http:// URL in a SUBRESOURCE position (<img src>,
// <script src>, el.src =, setAttribute('src', ...), importScripts) is reported.
// Other positions (a bare constant, a fetch argument, a navigation href) belong
// to no-http-urls / require-https-only. XML namespace URIs are exempt because
// "nothing is ever fetched from them" -- that rationale does not hold in a src
// position, where the browser does fetch it over http, so there it is a load.
// URL schemes are case-insensitive.
module detect_mixed_content {
  type Pos = JsxImgSrc | JsxScriptSrc | ElSrcAssign | SetAttrSrc | ImportScripts | BareConst | FetchArg | JsxAnchorHref | CreateElementNS
  type Url = Http | Https | ProtoRel | XmlNs | UpperHttp

  pure def subresource(p: Pos): bool = match p {
    | JsxImgSrc => true
    | JsxScriptSrc => true
    | ElSrcAssign => true
    | SetAttrSrc => true
    | ImportScripts => true
    | _ => false
  }

  pure def insecure(u: Url): bool = u == Http or u == UpperHttp or u == XmlNs

  pure def reports(p: Pos, u: Url): bool = subresource(p) and insecure(u)

  var pos: Pos
  var url: Url
  var verdict: bool

  action step = {
    nondet p = Set(JsxImgSrc, JsxScriptSrc, ElSrcAssign, SetAttrSrc, ImportScripts, BareConst, FetchArg, JsxAnchorHref, CreateElementNS).oneOf()
    nondet u = Set(Http, Https, ProtoRel, XmlNs, UpperHttp).oneOf()
    all { pos' = p, url' = u, verdict' = reports(p, u) }
  }

  action init = step
}
