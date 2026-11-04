// Model of eslint-plugin-postgresql-security/no-hardcoded-credentials (CWE-798).
// A password written into source leaks with the repository: a string literal
// `password` on a pg `Pool` / `Client`, postgres.js `postgres(...)` or
// pg-promise `pgp(...)` config (any key spelling, through a config variable or
// a config factory in the same file), and a `postgres://user:password@host`
// DSN passed to the driver (even a `localhost` one: the doc's own example) or
// written anywhere in the file. Safe: credentials from the environment, a DSN
// with no password, a loopback DSN that is only a module constant (local dev
// defaults), and a TypeORM options object (typeorm-security owns that
// finding). Files with no PostgreSQL evidence are not judged; a `postgres://`
// DSN in the file is that evidence on its own, like a driver import. With no
// driver import, an unbound `new Pool(...)` is not known to be pg, so only the
// file-wide DSN sweep applies, and it skips loopback hosts.
module no_hardcoded_credentials {
  type Ctor =
    | Named | Default | Namespace | Renamed | Require | RequireMember | Client
    | PostgresJs | PgPromise | NoImport
  type Cred =
    | PasswordLiteral | QuotedKey | ComputedKey | ConfigVar | Factory
    | DsnOption | BareDsn | DsnAnywhere
    | LoopbackDsn
    | PasswordEnv | DsnEnv | DsnNoPassword | LoopbackAnywhere | TypeOrm

  pure def hardcoded(c: Cred): bool = match c {
    | PasswordLiteral => true
    | QuotedKey => true
    | ComputedKey => true
    | ConfigVar => true
    | Factory => true
    | DsnOption => true
    | BareDsn => true
    | DsnAnywhere => true
    | PasswordEnv => false
    | DsnEnv => false
    | DsnNoPassword => false
    | LoopbackDsn => true
    | LoopbackAnywhere => false
    | TypeOrm => false
  }

  // postgres.js takes its URL as the first argument, not `connectionString`.
  pure def applies(c: Ctor, k: Cred): bool =
    not(k == DsnOption and c == PostgresJs)

  // A non-loopback postgres:// URL with a password, anywhere in the file.
  pure def sweptDsn(k: Cred): bool =
    k == DsnOption or k == BareDsn or k == DsnAnywhere

  pure def reports(c: Ctor, k: Cred): bool =
    if (c == NoImport) sweptDsn(k) else hardcoded(k)

  var ctor: Ctor
  var cred: Cred
  var verdict: bool

  action step = {
    nondet c = Set(
      Named, Default, Namespace, Renamed, Require, RequireMember, Client,
      PostgresJs, PgPromise, NoImport,
    ).oneOf()
    nondet k = Set(
      PasswordLiteral, QuotedKey, ComputedKey, ConfigVar, Factory,
      DsnOption, BareDsn, DsnAnywhere, LoopbackDsn,
      PasswordEnv, DsnEnv, DsnNoPassword, LoopbackAnywhere, TypeOrm,
    ).filter(x => applies(c, x)).oneOf()
    all { ctor' = c, cred' = k, verdict' = reports(c, k) }
  }

  action init = step
}
