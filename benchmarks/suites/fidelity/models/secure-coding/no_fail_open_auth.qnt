// Model of eslint-plugin-secure-coding/no-fail-open-auth (CWE-636).
// Contract: a catch clause is reported when its try block makes a security-
// decision call (verb + enumerated security noun, is/has/can + noun, or
// authenticate/authorize) AND the catch fails open: returns a truthy literal,
// or swallows (no throw/return/denial call) with work following the try/catch.
// Bare verbs (jwt.verify), non-decision names (assertAuthSdkError) and calls
// inside a callback declared in the try are not decisions. Rethrow, return
// false, next(err) and object returns are not fail-open.
module no_fail_open_auth {
  type Call = VerifyToken | AssertAdmin | IsAuthorized | Authenticate | BareVerify | AuthSdkError | InCallback
  type Catch = ReturnTrue | ReturnFalse | Empty | LogOnly | Rethrow | NextErr | ReturnObj

  pure def decision(c: Call): bool = Set(VerifyToken, AssertAdmin, IsAuthorized, Authenticate).contains(c)

  pure def reports(c: Call, k: Catch, after: bool): bool =
    decision(c) and (k == ReturnTrue or (Set(Empty, LogOnly).contains(k) and after))

  var call: Call
  var catchBody: Catch
  var after: bool
  var verdict: bool

  action step = {
    nondet c = Set(VerifyToken, AssertAdmin, IsAuthorized, Authenticate, BareVerify, AuthSdkError, InCallback).oneOf()
    nondet k = Set(ReturnTrue, ReturnFalse, Empty, LogOnly, Rethrow, NextErr, ReturnObj).oneOf()
    nondet a = Set(true, false).oneOf()
    all { call' = c, catchBody' = k, after' = a, verdict' = reports(c, k, a) }
  }

  action init = step
}
