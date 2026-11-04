// Model of eslint-plugin-postgresql-security/no-insecure-ssl (CWE-295).
// A PostgreSQL connection whose TLS settings turn certificate verification off
// is open to a man-in-the-middle: `ssl: { rejectUnauthorized: false }` on a pg
// `Pool` / `Client`, postgres.js `postgres(url, { ssl })` or pg-promise
// `pgp({ ssl })`, in any key spelling (quoted, computed), in any branch of a
// conditional (`isProd ? { rejectUnauthorized: false } : false`), held in a
// variable or returned by a config factory in the same file, and pg's DSN
// spelling of the same thing, `?sslmode=no-verify`. Safe: `ssl: true`, a CA
// bundle, `rejectUnauthorized: true`, `sslmode=verify-full`, and `ssl: false`
// (no TLS at all is a different weakness, not a disabled certificate check).
// Files with no PostgreSQL import are not judged.
module no_insecure_ssl {
  type Ctor =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | PostgresJs | PgPromise | NoImport
  type Ssl =
    | RejectFalse | QuotedKey | ComputedKey | Conditional | SslVar | ConfigVar
    | Factory | NoVerifyDsn | NoVerifyTemplate
    | RejectTrue | CaOnly | SslTrue | SslFalse | VerifyFullDsn | ConditionalSafe

  pure def insecure(s: Ssl): bool = match s {
    | RejectFalse => true
    | QuotedKey => true
    | ComputedKey => true
    | Conditional => true
    | SslVar => true
    | ConfigVar => true
    | Factory => true
    | NoVerifyDsn => true
    | NoVerifyTemplate => true
    | RejectTrue => false
    | CaOnly => false
    | SslTrue => false
    | SslFalse => false
    | VerifyFullDsn => false
    | ConditionalSafe => false
  }

  // A DSN query string is pg's (pg-connection-string) spelling only.
  pure def applies(c: Ctor, s: Ssl): bool =
    if (s == NoVerifyDsn or s == NoVerifyTemplate or s == VerifyFullDsn)
      c != PostgresJs and c != PgPromise
    else true

  pure def reports(c: Ctor, s: Ssl): bool = c != NoImport and insecure(s)

  var ctor: Ctor
  var ssl: Ssl
  var verdict: bool

  action step = {
    nondet c = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      PostgresJs, PgPromise, NoImport,
    ).oneOf()
    nondet s = Set(
      RejectFalse, QuotedKey, ComputedKey, Conditional, SslVar, ConfigVar,
      Factory, NoVerifyDsn, NoVerifyTemplate,
      RejectTrue, CaOnly, SslTrue, SslFalse, VerifyFullDsn, ConditionalSafe,
    ).filter(x => applies(c, x)).oneOf()
    all { ctor' = c, ssl' = s, verdict' = reports(c, s) }
  }

  action init = step
}
