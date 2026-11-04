// Model of eslint-plugin-knex-security/require-tls (CWE-319, CWE-295).
// A knex connection that turns TLS off (`ssl: false`, `sslmode=disable` in
// the URL) sends queries and credentials in cleartext; one that keeps TLS but
// stops verifying the server (`rejectUnauthorized: false`,
// `sslmode=no-verify`) lets an impostor answer for the database. Both are
// reported, also through a constant bound earlier or a ternary arm. TLS on,
// a CA supplied, `rejectUnauthorized: true`, a URL with `verify-full`, and a
// value only known at runtime (`ssl: useTls`) are silent. A connection that
// says nothing about TLS is left to the driver default and not reported
// (the documented findings are all explicit settings). Judged on knex(...)
// under every import spelling and on a knexfile; not judged: a file with no
// knex, another library's pool in a knex file, a TLS object with no
// connection neighbour, and test files.
module require_tls {
  type Site =
    | Default | Named | Renamed | Require | RequireCall | ConfigVar | Knexfile
    | NoImport | OtherLib | Bare | InTest
  type Tls =
    | SslFalse | RejectFalse | RequireRejectFalse | ConstFalse | TernaryFalse
    | SslTrue | SslCa | RejectTrue | Runtime | RejectRuntime | NoSsl
    | UrlDisable | UrlNoVerify | UrlVerifyFull | UrlPlain

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
  }

  pure def isUrl(t: Tls): bool =
    Set(UrlDisable, UrlNoVerify, UrlVerifyFull, UrlPlain).contains(t)

  // A bare TLS object has no URL form.
  pure def applies(s: Site, t: Tls): bool = not(s == Bare and isUrl(t))

  pure def judged(s: Site): bool =
    not(Set(NoImport, OtherLib, Bare, InTest).contains(s))

  pure def reports(s: Site, t: Tls): bool = judged(s) and insecure(t)

  var site: Site
  var tls: Tls
  var verdict: bool

  action step = {
    nondet s = Set(
      Default, Named, Renamed, Require, RequireCall, ConfigVar, Knexfile,
      NoImport, OtherLib, Bare, InTest,
    ).oneOf()
    nondet t = Set(
      SslFalse, RejectFalse, RequireRejectFalse, ConstFalse, TernaryFalse,
      SslTrue, SslCa, RejectTrue, Runtime, RejectRuntime, NoSsl,
      UrlDisable, UrlNoVerify, UrlVerifyFull, UrlPlain,
    ).filter(x => applies(s, x)).oneOf()
    all { site' = s, tls' = t, verdict' = reports(s, t) }
  }

  action init = step
}
