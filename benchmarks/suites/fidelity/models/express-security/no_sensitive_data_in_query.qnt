// Model of eslint-plugin-express-security/no-sensitive-data-in-query (CWE-598).
// Reading a sensitive parameter from the query string (`req.query.x`,
// `req.query['x']`, destructuring from req.query, on req or request) reports.
// Sensitivity matches whole name tokens (camelCase / snake_case split, trivial
// plurals): password, token, secret, apiKey, auth, credential, ssn, card —
// so `author` and `cardinality` are not sensitive. sensitiveParams extends
// the terms; extraPatterns adds regexes over the raw name; allowedParams
// exempts exact names. Route params and the body are not query strings.
// No Express evidence in the file: no report.
module no_sensitive_data_in_query {
  type Name =
    | Password | Passwords | ApiTokenSnake | AccessTokenCamel | Token
    | Author | Cardinality | Page | Pin | OtpCode
  type Access =
    | Dot | Bracket | Destructure | DestructureRenamed | RequestName
    | Params | Body
  type Cfg = Default | SensitivePin | PatternOtp | AllowToken | NoExpress

  pure def sensitive(n: Name, c: Cfg): bool = match n {
    | Password => true
    | Passwords => true
    | ApiTokenSnake => true
    | AccessTokenCamel => true
    | Token => c != AllowToken
    | Pin => c == SensitivePin
    | OtpCode => c == PatternOtp
    | _ => false
  }

  pure def fromQuery(a: Access): bool = a != Params and a != Body

  var name: Name
  var access: Access
  var cfg: Cfg
  var verdict: bool

  action step = {
    nondet n = Set(Password, Passwords, ApiTokenSnake, AccessTokenCamel, Token,
                   Author, Cardinality, Page, Pin, OtpCode).oneOf()
    nondet a = Set(Dot, Bracket, Destructure, DestructureRenamed, RequestName, Params, Body).oneOf()
    nondet c = Set(Default, SensitivePin, PatternOtp, AllowToken, NoExpress).oneOf()
    all { name' = n, access' = a, cfg' = c, verdict' = (sensitive(n, c) and fromQuery(a) and c != NoExpress) }
  }

  action init = step
}
