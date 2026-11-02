// Model of eslint-plugin-browser-security/no-sensitive-localstorage (CWE-922).
// Contract: a WRITE to localStorage (and to sessionStorage only when
// checkSessionStorage) whose key names a term in `sensitivePatterns` is
// reported. Bearer keys (`token`) are not in the default vocabulary: they are
// owned by no-jwt-in-storage (the documented partition). Reads are not writes.
// `className` contains the letters "ssn" but names no secret.
module no_sensitive_localstorage {
  // Test-file context: Prod is src/a.ts, TestDefault a test file under the
  // default options, TestFlipped a test file with allowInTests set opposite to
  // its default. Outside Prod every dimension but the key is pinned to one
  // representative, so the option is covered on tainted and safe inputs
  // without multiplying the domain.
  type Ctx = Prod | TestDefault | TestFlipped

  pure def skipped(c: Ctx): bool = c == TestFlipped
  type Key = Password | UserPassword | ApiKeySnake | ApiKeyCamel | Token | ClassName | Theme | PinCode
  type Patterns = DefaultPatterns | CustomPin
  type Form = SetItem | Bracket | Dot | WindowSetItem | GetItem
  type Storage = Local | Session

  pure def sensitive(k: Key, p: Patterns): bool = match p {
    | DefaultPatterns => match k {
        | Password => true
        | UserPassword => true
        | ApiKeySnake => true
        | ApiKeyCamel => true
        | _ => false
      }
    | CustomPin => k == PinCode
  }

  pure def isWrite(f: Form): bool = f != GetItem

  pure def inScope(s: Storage, checkSS: bool): bool = match s {
    | Local => true
    | Session => checkSS
  }

  pure def reports(k: Key, p: Patterns, f: Form, s: Storage, checkSS: bool): bool =
    isWrite(f) and inScope(s, checkSS) and sensitive(k, p)

  var key: Key
  var patterns: Patterns
  var form: Form
  var storage: Storage
  var checkSS: bool
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet x = Set(Prod, TestDefault, TestFlipped).oneOf()
    nondet k = Set(Password, UserPassword, ApiKeySnake, ApiKeyCamel, Token, ClassName, Theme, PinCode).oneOf()
    nondet p0 = Set(DefaultPatterns, CustomPin).oneOf()
    nondet f0 = Set(SetItem, Bracket, Dot, WindowSetItem, GetItem).oneOf()
    nondet s0 = Set(Local, Session).oneOf()
    nondet c0 = Set(true, false).oneOf()
    val p = if (x == Prod) p0 else DefaultPatterns
    val f = if (x == Prod) f0 else SetItem
    val s = if (x == Prod) s0 else Local
    val c = if (x == Prod) c0 else false
    all {
      key' = k, patterns' = p, form' = f, storage' = s, checkSS' = c, ctx' = x,
      verdict' = (not(skipped(x)) and reports(k, p, f, s, c)),
    }
  }

  action init = step
}
