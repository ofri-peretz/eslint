// Model of eslint-plugin-mysql-security/no-hardcoded-credentials (CWE-798).
// A literal database password in a mysql2 / mysql connection config is a
// committed secret: written inline (a string or a hole-free template), held
// in a const, or as the literal arm of an env fallback (`||`, `??`, a
// ternary). An empty password (the local trust-auth sentinel), an env read,
// a parameter, a value from a config object this file cannot see and a
// template with a hole are not. A config is a connection when it is handed
// to the driver (inline or through a const) or names somewhere to connect to
// (`host`); a login / signup form ({ user, password } / { password, confirm })
// and another library's options (an ioredis client) are not. A `mysql://`
// URL with `user:pass@` userinfo is a finding, as a `uri` option, a DSN const
// handed to the driver, or a template whose static head holds the password;
// a URL with no password, a template whose hole is the password, an env URL
// and another scheme's URL are not. Every import / require spelling of
// `mysql2` and `mysql` is judged; a file with no driver import and a test
// file are not.
module no_hardcoded_credentials {
  type Part = Values | Shapes | Urls | Drivers
  type Value =
    | Literal | HoleFreeTemplate | ConstLiteral | EnvOr | EnvNullish
    | TernaryArm | Empty | Env | Param | ConfigObject | TemplateHole
  type Shape = Inline | ConfigConst | HostObject | LoginForm | SignupForm | OtherLib
  type Url =
    | UriCreds | DsnConst | DsnTemplateHost | UriNoPassword | UriNoUserinfo
    | DsnTemplatePassword | UriEnv | PostgresUri
  type Driver =
    | Default | Promise | Named | Namespace | RequireMysql | RequireDestructured
    | RequireMember | NoImport | TestFile

  pure def committed(v: Value): bool = match v {
    | Literal => true
    | HoleFreeTemplate => true
    | ConstLiteral => true
    | EnvOr => true
    | EnvNullish => true
    | TernaryArm => true
    | _ => false
  }
  pure def connection(s: Shape): bool =
    s == Inline or s == ConfigConst or s == HostObject
  pure def urlCreds(u: Url): bool =
    u == UriCreds or u == DsnConst or u == DsnTemplateHost
  pure def judged(d: Driver): bool = d != NoImport and d != TestFile

  pure def reports(pt: Part, v: Value, s: Shape, u: Url, d: Driver): bool =
    judged(d) and (if (pt == Urls) urlCreds(u) else committed(v) and connection(s))

  var part: Part
  var value: Value
  var shape: Shape
  var url: Url
  var driver: Driver
  var verdict: bool

  action step = {
    nondet pt = Set(Values, Shapes, Urls, Drivers).oneOf()
    nondet v = (if (pt == Values) Set(
      Literal, HoleFreeTemplate, ConstLiteral, EnvOr, EnvNullish, TernaryArm,
      Empty, Env, Param, ConfigObject, TemplateHole,
    ) else if (pt == Urls) Set(Literal) else Set(Literal, Env)).oneOf()
    nondet s = (if (pt == Shapes) Set(
      Inline, ConfigConst, HostObject, LoginForm, SignupForm, OtherLib,
    ) else Set(Inline)).oneOf()
    nondet u = (if (pt == Urls) Set(
      UriCreds, DsnConst, DsnTemplateHost, UriNoPassword, UriNoUserinfo,
      DsnTemplatePassword, UriEnv, PostgresUri,
    ) else Set(UriCreds)).oneOf()
    nondet d = (if (pt == Drivers) Set(
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
