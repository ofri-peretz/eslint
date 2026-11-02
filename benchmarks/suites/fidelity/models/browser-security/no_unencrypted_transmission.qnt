// Model of eslint-plugin-browser-security/no-unencrypted-transmission (CWE-319).
// A connection string for a cleartext NON-WEB protocol (mongodb, redis, mysql)
// reports; its TLS twin (mongodb+srv, rediss) does not. `http://` and `ws://`
// are owned by the transport partition — require-https-only, no-http-urls,
// detect-mixed-content, require-websocket-wss, no-insecure-websocket — and this
// rule is silent on them (the doc now says so). localhost on these schemes is
// NOT exempt by default (it carries credentials that survive a host swap) -
// only via ignorePatterns, or in a test file under allowInTests, which exempts
// a written-down LOOPBACK host and nothing else: a real host in a test file
// still reports. An XML namespace identifier is never transmitted.
module no_unencrypted_transmission {
  type Url =
    | Http
    | Https
    | Ws
    | Wss
    | Mongo
    | MongoSrv
    | Redis
    | Rediss
    | Mysql
    | HttpUpper
    | HttpLocalhost
    | MongoLocalhost
    | W3Namespace
    | NotUrl
  type Form = Str | Tpl

  pure def cleartext(u: Url): bool = match u {
    | Mongo => true
    | Redis => true
    | Mysql => true
    | MongoLocalhost => true
    | _ => false
  }

  pure def reports(u: Url, f: Form, ignoreLocal: bool, testFile: bool, allowInTests: bool): bool =
    cleartext(u) and not(u == MongoLocalhost and (ignoreLocal or (testFile and allowInTests)))

  var url: Url
  var form: Form
  var ignoreLocal: bool
  var testFile: bool
  var allowInTests: bool
  var verdict: bool

  action step = {
    nondet u = Set(Http, Https, Ws, Wss, Mongo, MongoSrv, Redis, Rediss, Mysql, HttpUpper, HttpLocalhost, MongoLocalhost, W3Namespace, NotUrl).oneOf()
    nondet f = Set(Str, Tpl).oneOf()
    nondet i = Set(true, false).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    all {
      url' = u, form' = f, ignoreLocal' = i, testFile' = t, allowInTests' = a,
      verdict' = reports(u, f, i, t, a),
    }
  }

  action init = step
}
