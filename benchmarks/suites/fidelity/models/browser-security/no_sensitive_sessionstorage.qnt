// Model of eslint-plugin-browser-security/no-sensitive-sessionstorage (CWE-922).
// Contract: a WRITE to sessionStorage whose key names a sensitive term (the
// shared password/secret/api-key vocabulary, plus `additionalPatterns`, as
// whole words) is reported. Bearer keys (accessToken) are deferred to
// no-jwt-in-storage per the documented partition. localStorage is another rule's.
module no_sensitive_sessionstorage {
  type Key = Password | ApiKeyCamel | ApiKeySnake | AccessToken | Theme | SearchQuery | ClassName | Entitlement
  type Form = SetItem | Bracket | Dot | WindowSetItem | GetItem | LocalSetItem
  type Ctx = Prod | TestDefault | TestFlipped

  pure def sensitive(k: Key, extra: bool): bool = match k {
    | Password => true
    | ApiKeyCamel => true
    | ApiKeySnake => true
    | Entitlement => extra
    | _ => false
  }

  pure def sessionWrite(f: Form): bool = match f {
    | GetItem => false
    | LocalSetItem => false
    | _ => true
  }

  // allowInTests defaults to true.
  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(k: Key, f: Form, extra: bool, c: Ctx): bool =
    not(skipped(c)) and sessionWrite(f) and sensitive(k, extra)

  var key: Key
  var form: Form
  var extra: bool
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet k = Set(Password, ApiKeyCamel, ApiKeySnake, AccessToken, Theme, SearchQuery, ClassName, Entitlement).oneOf()
    nondet f = Set(SetItem, Bracket, Dot, WindowSetItem, GetItem, LocalSetItem).oneOf()
    nondet e = Set(true, false).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { key' = k, form' = f, extra' = e, ctx' = c, verdict' = reports(k, f, e, c) }
  }

  action init = step
}
