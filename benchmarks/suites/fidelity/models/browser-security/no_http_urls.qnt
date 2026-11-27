// Model of eslint-plugin-browser-security/no-http-urls (CWE-319).
// An http:// URL literal reports unless its host is allowed (localhost,
// 127.0.0.1, allowedHosts), its port is in allowedPorts, or it is an XML
// namespace identifier (registered namespace host, or an xmlns position), or it
// is handed to a DOM namespace method such as getAttributeNS, whoever minted it.
module no_http_urls {
  type Url =
    | HttpRemote
    | HttpsRemote
    | HttpUpper
    | HttpLocalhost
    | HttpLocalhostPort
    | Http127
    | HttpLocalhostLookalike
    | HttpW3Svg
    | HttpW3Path
    | HttpW3Lookalike
    | HttpUnlistedNs
    | HttpPort8080
    | HttpDevInternal
    | NotUrl
  type Form = Str | Tpl
  type Pos = Var | XmlnsProp | XmlnsColonProp | NsArgument | NsConstAlsoFetched

  pure def reports(u: Url, f: Form, p: Pos, portOpt: bool, hostOpt: bool): bool =
    if (p == XmlnsProp or p == XmlnsColonProp or p == NsArgument) false
    else match u {
      | HttpRemote => true
      | HttpsRemote => false
      | HttpUpper => true
      | HttpLocalhost => false
      | HttpLocalhostPort => false
      | Http127 => false
      | HttpLocalhostLookalike => true
      | HttpW3Svg => false
      | HttpW3Path => true
      | HttpW3Lookalike => true
      | HttpUnlistedNs => true
      | HttpPort8080 => not(portOpt)
      | HttpDevInternal => not(hostOpt)
      | NotUrl => false
    }

  var url: Url
  var form: Form
  var pos: Pos
  var portOpt: bool
  var hostOpt: bool
  var verdict: bool

  action step = {
    nondet u = Set(HttpRemote, HttpsRemote, HttpUpper, HttpLocalhost, HttpLocalhostPort, Http127, HttpLocalhostLookalike, HttpW3Svg, HttpW3Path, HttpW3Lookalike, HttpUnlistedNs, HttpPort8080, HttpDevInternal, NotUrl).oneOf()
    nondet f = Set(Str, Tpl).oneOf()
    nondet p = Set(Var, XmlnsProp, XmlnsColonProp, NsArgument, NsConstAlsoFetched).oneOf()
    nondet a = Set(true, false).oneOf()
    nondet b = Set(true, false).oneOf()
    all { url' = u, form' = f, pos' = p, portOpt' = a, hostOpt' = b, verdict' = reports(u, f, p, a, b) }
  }

  action init = step
}
