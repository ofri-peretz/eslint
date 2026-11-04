// Model of eslint-plugin-mysql-security/require-tls (CWE-319, CWE-295).
// A mysql2 / mysql connection config that turns TLS off (`ssl: false`) sends
// queries and credentials in cleartext; one that keeps TLS but sets
// `rejectUnauthorized: false` stops authenticating the server. Both are
// findings, written inline, through a const, or as one arm of a ternary.
// `ssl: { ca }`, the bundled-CA name `'Amazon RDS'`,
// `rejectUnauthorized: true`, a runtime-decided value (a parameter, an env
// comparison) and a config that does not mention ssl are not. A config is a
// connection when it is handed to the driver (inline or through a const) or
// sits beside a connection key (`host`); a TLS object with no connection
// neighbour and another library's options (an https.Agent) are not. The URL
// form `mysql://...?ssl=false` is a finding; a URL without it is not. Every
// import / require spelling of `mysql2` and `mysql` is judged; a file with
// no driver import and a test file are not.
module require_tls {
  type Part = Values | Shapes | Urls | Drivers
  type Value =
    | SslFalse | ConstFalse | RejectFalse | CaRejectFalse | RejectConstFalse
    | TernaryFalseArm | Ca | AmazonRds | RejectTrue | RuntimeParam
    | EnvCompare | Absent
  type Shape = Inline | ConfigConst | HostObject | LoneTls | HttpsAgent
  type Url = UrlSslFalse | UrlPlain
  type Driver =
    | Default | Promise | Named | Namespace | RequireMysql | RequireDestructured
    | RequireMember | NoImport | TestFile

  pure def insecure(v: Value): bool = match v {
    | SslFalse => true
    | ConstFalse => true
    | RejectFalse => true
    | CaRejectFalse => true
    | RejectConstFalse => true
    | TernaryFalseArm => true
    | _ => false
  }
  pure def connection(s: Shape): bool =
    s == Inline or s == ConfigConst or s == HostObject
  pure def judged(d: Driver): bool = d != NoImport and d != TestFile

  pure def reports(pt: Part, v: Value, s: Shape, u: Url, d: Driver): bool =
    judged(d) and (if (pt == Urls) u == UrlSslFalse else insecure(v) and connection(s))

  var part: Part
  var value: Value
  var shape: Shape
  var url: Url
  var driver: Driver
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Shapes, Urls, Drivers).oneOf()
    nondet v = (if (pt == Values) Set(
      SslFalse, ConstFalse, RejectFalse, CaRejectFalse, RejectConstFalse,
      TernaryFalseArm, Ca, AmazonRds, RejectTrue, RuntimeParam, EnvCompare,
      Absent,
    ) else if (pt == Urls) Set(SslFalse) else Set(RejectFalse, Ca)).oneOf()
    nondet s = (if (pt == Shapes) Set(
      Inline, ConfigConst, HostObject, LoneTls, HttpsAgent,
    ) else Set(Inline)).oneOf()
    nondet u = (if (pt == Urls) Set(UrlSslFalse, UrlPlain) else Set(UrlPlain)).oneOf()
    nondet d = (if (pt == Drivers or pt == Urls) Set(
      Default, Promise, Named, Namespace, RequireMysql, RequireDestructured,
      RequireMember, NoImport, TestFile,
    ) else Set(Promise)).oneOf()
    all {
      part' = pt,
      value' = v,
      shape' = s,
      url' = u,
      driver' = d,
      verdict' = reports(pt, v, s, u, d),
    }
  }

  action init = step
}
