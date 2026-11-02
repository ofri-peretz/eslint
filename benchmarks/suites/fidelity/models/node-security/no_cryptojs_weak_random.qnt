// Model of eslint-plugin-node-security/no-cryptojs-weak-random (CWE-338).
// crypto-js WordArray.random is reported however the crypto-js object is bound
// (default import, namespace import, require) and however random is reached
// (member chain, a WordArray local, subscript, an alias of the function).
// WordArray.create, a WordArray from another module, and `CryptoJS.random` (no
// such crypto-js API — the doc no longer lists it) are not.
module no_cryptojs_weak_random {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Source = DefaultImport | NamespaceImport | Require
  type Call = LibWordArrayRandom | LocalWordArrayRandom | CryptoJSRandom | BracketRandom | AliasedFn | Create | UnrelatedWordArray

  pure def reports(s: Source, c: Call): bool = match c {
    | Create => false
    | UnrelatedWordArray => false
    | CryptoJSRandom => false
    | _ => true
  }

  var source: Source
  var call: Call
  var verdict: bool

  action step = {
    nondet s = Set(DefaultImport, NamespaceImport, Require).oneOf()
    nondet c = Set(LibWordArrayRandom, LocalWordArrayRandom, CryptoJSRandom, BracketRandom, AliasedFn, Create, UnrelatedWordArray).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { source' = s, call' = c, testCtx' = tc, verdict' = (reports(s, c) and not(exempt(tc))) }
  }

  action init = step
}
