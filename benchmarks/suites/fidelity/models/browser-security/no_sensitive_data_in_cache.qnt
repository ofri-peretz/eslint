// Model of eslint-plugin-browser-security/no-sensitive-data-in-cache (CWE-524).
// A Cache API write (`put`, on a Cache proven to come from caches.open())
// whose literal key names a secret (password, token, credit card, ssn)
// reports; a read, a benign key, or a method the Cache API does not have does
// not. A free `cache` object of unknown type (an LRU, a Map, a memoizer) is
// not the Cache API and is out of scope: the rule was narrowed to the
// browser's Cache Storage, and its doc now says so.
// Test files are skipped while allowInTests (default true).
module no_sensitive_data_in_cache {
  type Key =
    | Token
    | AuthToken
    | AccessTokenCamel
    | Password
    | UserPasswordCamel
    | CreditCardSnake
    | CreditCardCamel
    | Ssn
    | SsnUpper
    | Theme
  // Receiver: the doc's free `cache` object, or a Cache from caches.open().
  type Recv = DocCache | CacheStorage
  type Method = SetCall | Put | Store | ComputedPut | Get

  pure def sensitive(k: Key): bool = k != Theme

  // A Cache (Cache API) has put/add/addAll but no set or store method.
  pure def writes(m: Method, r: Recv): bool =
    r == CacheStorage and (m == Put or m == ComputedPut)

  pure def reports(k: Key, m: Method, r: Recv, testFile: bool, allowInTests: bool): bool =
    if (testFile and allowInTests) false
    else sensitive(k) and writes(m, r)

  var key: Key
  var method: Method
  var recv: Recv
  var testFile: bool
  var allowInTests: bool
  var verdict: bool

  action step = {
    nondet k = Set(Token, AuthToken, AccessTokenCamel, Password, UserPasswordCamel, CreditCardSnake, CreditCardCamel, Ssn, SsnUpper, Theme).oneOf()
    nondet m = Set(SetCall, Put, Store, ComputedPut, Get).oneOf()
    nondet r = Set(DocCache, CacheStorage).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet a = Set(true, false).oneOf()
    all { key' = k, method' = m, recv' = r, testFile' = t, allowInTests' = a, verdict' = reports(k, m, r, t, a) }
  }

  action init = step
}
