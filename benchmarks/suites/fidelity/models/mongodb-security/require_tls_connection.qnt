// Model of eslint-plugin-mongodb-security/require-tls-connection (CWE-295).
// A MongoDB connection must be encrypted. `mongodb+srv://` turns TLS on by
// default; `tls=true` / `ssl=true` in the URI or `tls: true` / `ssl: true` in
// the options turn it on for `mongodb://`. A plain `mongodb://` literal with
// neither, and a `tls=false` / `ssl=false` / `tls: false` / `ssl: false`
// anywhere (it turns the `+srv` default back off), is reported. A URI held in
// a variable with no TLS option says nothing either way and is left out of the
// domain. Only a receiver bound to a `mongodb`/`mongoose` import or named
// `mongo*` is a MongoDB connection; a Redis or TypeORM `.connect()` is not, and
// neither is an unbound `client.connect()` in a file with no Mongo. An unbound
// `mongoose.connect()` is judged when its literal `mongodb://` URI makes the
// file a Mongo file. `allowInTests` (default true) also covers
// `test/` and `fixtures/` dirs.
module require_tls_connection {
  type TestCtx = Prod | TestDefault | TestFlip | TestDirDefault | FixturesDefault | TestDirFlip
  pure def exempt(t: TestCtx): bool =
    t == TestDefault or t == TestDirDefault or t == FixturesDefault
  var testCtx: TestCtx

  type Site = MongooseConnect | RequireConnect | CreateConnection | NamedConnect | MongoNamed | RedisClient | QueryRunner | Unbound | NoImport
  type Conn =
    | PlainLiteral | OptsTlsFalse | OptsSslFalse | UriTlsFalse | SrvUriTlsFalse | SrvOptsTlsFalse
    | OptsTlsTrue | OptsSslTrue | SrvLiteral | UriTlsTrue | UriSslTrue | PlainWithOptsTlsTrue

  pure def insecure(c: Conn): bool = match c {
    | PlainLiteral => true
    | OptsTlsFalse => true
    | OptsSslFalse => true
    | UriTlsFalse => true
    | SrvUriTlsFalse => true
    | SrvOptsTlsFalse => true
    | OptsTlsTrue => false
    | OptsSslTrue => false
    | SrvLiteral => false
    | UriTlsTrue => false
    | UriSslTrue => false
    | PlainWithOptsTlsTrue => false
  }

  // The URI is written as a `mongodb://` literal: Mongo evidence on its own.
  pure def literalUri(c: Conn): bool = match c {
    | PlainLiteral => true
    | OptsTlsFalse => false
    | OptsSslFalse => false
    | UriTlsFalse => true
    | SrvUriTlsFalse => true
    | SrvOptsTlsFalse => true
    | OptsTlsTrue => false
    | OptsSslTrue => false
    | SrvLiteral => true
    | UriTlsTrue => true
    | UriSslTrue => true
    | PlainWithOptsTlsTrue => true
  }

  // `Unbound`: `mongoose.connect(...)` with no import. The receiver is named
  // `mongo*`, so it is judged when the file holds Mongo evidence: a literal URI.
  pure def mongoSite(s: Site, c: Conn): bool = match s {
    | RedisClient => false
    | QueryRunner => false
    | NoImport => false
    | Unbound => literalUri(c)
    | _ => true
  }

  pure def reports(s: Site, c: Conn): bool = mongoSite(s, c) and insecure(c)

  var site: Site
  var conn: Conn
  var verdict: bool

  action step = {
    nondet s = Set(MongooseConnect, RequireConnect, CreateConnection, NamedConnect, MongoNamed, RedisClient, QueryRunner, Unbound, NoImport).oneOf()
    nondet c = Set(
      PlainLiteral, OptsTlsFalse, OptsSslFalse, UriTlsFalse, SrvUriTlsFalse, SrvOptsTlsFalse,
      OptsTlsTrue, OptsSslTrue, SrvLiteral, UriTlsTrue, UriSslTrue, PlainWithOptsTlsTrue,
    ).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip, TestDirDefault, FixturesDefault, TestDirFlip).oneOf()
    all {
      site' = s,
      conn' = c,
      testCtx' = tc,
      verdict' = (reports(s, c) and not(exempt(tc))),
    }
  }

  action init = step
}
