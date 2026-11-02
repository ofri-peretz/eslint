// Model of eslint-plugin-browser-security/no-sensitive-indexeddb (CWE-922).
// Contract: creating an object store, or add/put of a record, whose store
// name / field / key names a sensitive term (whole word, plurals folded) is
// reported. `sensitiveTerms` replaces the vocabulary, `additionalPatterns` adds
// to it. A replaced vocabulary replaces EVERYTHING: under
// `sensitiveTerms: ['pin']` a bearer name (accessToken) is not reported.
//
// PENDING OWNER DECISION — not modelled: whether bearer names (accessToken)
// belong to this rule under the DEFAULT vocabulary. The partition note in
// no-jwt-in-storage.md / no-cookie-auth-tokens.md says the medium rules defer
// them; the rule header says no-jwt-in-storage covers only Web Storage, so
// deferring would be a false negative. Until that is decided, AccessToken is
// sampled only under ReplacePin, where the answer does not depend on it.
// add/put count only on a receiver that resolves to objectStore(); a bare
// `.add` on an unrelated receiver (a job queue) is not IndexedDB.
module no_sensitive_indexeddb {
  type Form = CreateStore | AddObj | PutObj | PutKeyArg | UnresolvedAdd
  type Name = Password | Passwords | ApiKey | Secrets | Preferences | CachedData | AccessToken | Entitlement | Pin
  type Opts = DefaultTerms | AddEntitlement | ReplacePin
  type Ctx = Prod | TestDefault | TestFlipped

  pure def builtin(n: Name): bool = match n {
    | Password => true
    | Passwords => true
    | ApiKey => true
    | Secrets => true
    | _ => false
  }

  pure def sensitive(n: Name, o: Opts): bool = match o {
    | DefaultTerms => builtin(n)
    | AddEntitlement => builtin(n) or n == Entitlement
    | ReplacePin => n == Pin
  }

  // allowInTests defaults to true.
  pure def skipped(c: Ctx): bool = c == TestDefault

  pure def reports(f: Form, n: Name, o: Opts, c: Ctx): bool =
    not(skipped(c)) and f != UnresolvedAdd and sensitive(n, o)

  var form: Form
  var name: Name
  var opts: Opts
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet f = Set(CreateStore, AddObj, PutObj, PutKeyArg, UnresolvedAdd).oneOf()
    nondet n = Set(Password, Passwords, ApiKey, Secrets, Preferences, CachedData, AccessToken, Entitlement, Pin).oneOf()
    nondet o = (if (n == AccessToken) Set(ReplacePin) else Set(DefaultTerms, AddEntitlement, ReplacePin)).oneOf()
    nondet c = Set(Prod, TestDefault, TestFlipped).oneOf()
    all { form' = f, name' = n, opts' = o, ctx' = c, verdict' = reports(f, n, o, c) }
  }

  action init = step
}
