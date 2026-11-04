// Model of eslint-plugin-typeorm-security/require-tls (CWE-319, CWE-295).
// A TypeORM DataSource that turns TLS off (`ssl: false`, `sslmode=disable` in
// its `url`) sends queries and credentials in cleartext; one that keeps TLS
// but stops verifying the server (`rejectUnauthorized: false`,
// `sslmode=no-verify`) lets an impostor answer for the database. Both are
// reported at the flat `ssl` option and inside the `extra` driver
// passthrough, also through a constant bound earlier or a ternary arm. The
// mssql driver spells it the other way round: `trustServerCertificate: true`
// (top level, as the docs show, or under `options`, as the driver reads it)
// is the unverified case, and `options.encrypt: false` is cleartext. TLS on,
// a CA supplied, `rejectUnauthorized: true`, `verify-full`, a runtime value
// and an option that says nothing about TLS are silent. Judged on
// `new DataSource(...)` under every import spelling, `TypeOrmModule.forRoot()`
// and an ormconfig (no import); not judged: a file with no TypeORM, another
// library's pool in a TypeORM file, a TLS object with no connection
// neighbour, and test files.
module require_tls {
  type Site =
    | Named | Renamed | Require | Namespace | Extra | ConfigVar | OrmConfig
    | NestForRoot | NoImport | OtherLib | Bare | InTest | MssqlTop | MssqlOptions
  type Tls =
    | SslFalse | RejectFalse | RequireRejectFalse | ConstFalse | TernaryFalse
    | SslTrue | SslCa | RejectTrue | Runtime | RejectRuntime | NoSsl
    | UrlDisable | UrlNoVerify | UrlVerifyFull | UrlPlain
    | TrustTrue | TrustFalse | TrustRuntime | EncryptFalse | EncryptTrue

  pure def insecure(t: Tls): bool = match t {
    | SslFalse => true
    | RejectFalse => true
    | RequireRejectFalse => true
    | ConstFalse => true
    | TernaryFalse => true
    | SslTrue => false
    | SslCa => false
    | RejectTrue => false
    | Runtime => false
    | RejectRuntime => false
    | NoSsl => false
    | UrlDisable => true
    | UrlNoVerify => true
    | UrlVerifyFull => false
    | UrlPlain => false
    | TrustTrue => true
    | TrustFalse => false
    | TrustRuntime => false
    | EncryptFalse => true
    | EncryptTrue => false
  }

  pure def isUrl(t: Tls): bool =
    Set(UrlDisable, UrlNoVerify, UrlVerifyFull, UrlPlain).contains(t)
  pure def isMssql(t: Tls): bool =
    Set(TrustTrue, TrustFalse, TrustRuntime, EncryptFalse, EncryptTrue).contains(t)

  pure def applies(s: Site, t: Tls): bool =
    if (s == MssqlTop) Set(TrustTrue, TrustFalse, TrustRuntime).contains(t)
    else if (s == MssqlOptions) isMssql(t)
    // `extra` and a bare object carry an ssl value, never a URL
    else if (s == Extra or s == Bare) not(isMssql(t) or isUrl(t))
    else not(isMssql(t))

  pure def judged(s: Site): bool =
    not(Set(NoImport, OtherLib, Bare, InTest).contains(s))

  pure def reports(s: Site, t: Tls): bool = judged(s) and insecure(t)

  var site: Site
  var tls: Tls
  var verdict: bool

  action step = {
    nondet s = Set(
      Named, Renamed, Require, Namespace, Extra, ConfigVar, OrmConfig,
      NestForRoot, NoImport, OtherLib, Bare, InTest, MssqlTop, MssqlOptions,
    ).oneOf()
    nondet t = Set(
      SslFalse, RejectFalse, RequireRejectFalse, ConstFalse, TernaryFalse,
      SslTrue, SslCa, RejectTrue, Runtime, RejectRuntime, NoSsl,
      UrlDisable, UrlNoVerify, UrlVerifyFull, UrlPlain,
      TrustTrue, TrustFalse, TrustRuntime, EncryptFalse, EncryptTrue,
    ).filter(x => applies(s, x)).oneOf()
    all { site' = s, tls' = t, verdict' = reports(s, t) }
  }

  action init = step
}
