// Model of eslint-plugin-knex-security/no-hardcoded-credentials (CWE-798).
// A database password written into source is reported wherever knex reads
// it: `connection.password`, or the userinfo of a connection URL. A literal,
// a substitution-free template, a literal bound to a constant, a literal arm
// of `||` / `??` / a ternary, and a URL (literal, constant, or a template whose
// static head already holds `user:password@`) are hardcoded. Not reported: an
// empty password (the trust-auth sentinel), `process.env`, a config object
// the file cannot see, a template with a hole in the password, a URL without
// a password. Judged on knex(...) under every import spelling and on a
// knexfile (`{ client: 'pg', connection }`, no import). Not judged: a file
// with no knex, another library's options in a knex file (a mysql2 pool), a
// login-form object with no host to connect to, and test files.
module no_hardcoded_credentials {
  type Site =
    | Default | Named | Renamed | Require | RequireCall | ConfigVar | Knexfile
    | NoImport | OtherLib | InTest | Form
  type Value =
    | Literal | Empty | Env | EnvOrLiteral | EnvNullishLiteral | ConstBound
    | TemplateHole | TemplateNoHole | AliasConfig | TernaryLiteral | BothRuntime
    | UrlCreds | UrlMysqlCreds | UrlUserOnly | UrlNoUser | UrlEnv
    | UrlTemplateHead | UrlTemplateHole | UrlConst

  pure def hardcoded(v: Value): bool = match v {
    | Literal => true
    | Empty => false
    | Env => false
    | EnvOrLiteral => true
    | EnvNullishLiteral => true
    | ConstBound => true
    | TemplateHole => false
    | TemplateNoHole => true
    | AliasConfig => false
    | TernaryLiteral => true
    | BothRuntime => false
    | UrlCreds => true
    | UrlMysqlCreds => true
    | UrlUserOnly => false
    | UrlNoUser => false
    | UrlEnv => false
    | UrlTemplateHead => true
    | UrlTemplateHole => false
    | UrlConst => true
  }

  pure def isUrl(v: Value): bool =
    Set(UrlCreds, UrlMysqlCreds, UrlUserOnly, UrlNoUser, UrlEnv,
        UrlTemplateHead, UrlTemplateHole, UrlConst).contains(v)

  // A login form has no URL position.
  pure def applies(s: Site, v: Value): bool = not(s == Form and isUrl(v))

  pure def judged(s: Site): bool =
    not(Set(NoImport, OtherLib, InTest, Form).contains(s))

  pure def reports(s: Site, v: Value): bool = judged(s) and hardcoded(v)

  var site: Site
  var value: Value
  var verdict: bool

  action step = {
    nondet s = Set(
      Default, Named, Renamed, Require, RequireCall, ConfigVar, Knexfile,
      NoImport, OtherLib, InTest, Form,
    ).oneOf()
    nondet v = Set(
      Literal, Empty, Env, EnvOrLiteral, EnvNullishLiteral, ConstBound,
      TemplateHole, TemplateNoHole, AliasConfig, TernaryLiteral, BothRuntime,
      UrlCreds, UrlMysqlCreds, UrlUserOnly, UrlNoUser, UrlEnv,
      UrlTemplateHead, UrlTemplateHole, UrlConst,
    ).filter(x => applies(s, x)).oneOf()
    all { site' = s, value' = v, verdict' = reports(s, v) }
  }

  action init = step
}
