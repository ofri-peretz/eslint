// Model of eslint-plugin-node-security/no-weak-hash-algorithm (CWE-327).
// A weak digest is reported when the code shows it protecting a secret
// (`.update(password)`); a checksum of plain data is not.
module no_weak_hash_algorithm {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type CallKind = CryptoCreateHash | BareCreateHash | Sha1Call | OtherCall
  type Alg = Md5 | Sha1Token | Sha1Hyphen | Md4 | Ripemd | Sha256 | NonLiteral

  pure def weakAlg(a: Alg): bool = match a {
    | Md5 => true
    | Sha1Token => true
    | Sha1Hyphen => true
    | Md4 => true
    | Ripemd => true
    | Sha256 => false
    | NonLiteral => false
  }

  // Spec: any SHA-1 spelling is weak, including the hyphenated "sha-1".
  pure def reports(k: CallKind, a: Alg, securityUse: bool): bool =
    securityUse and match k {
      | CryptoCreateHash => weakAlg(a)
      | BareCreateHash => weakAlg(a)
      | Sha1Call => true
      | OtherCall => false
    }

  var kind: CallKind
  var alg: Alg
  var securityUse: bool
  var verdict: bool

  action step = {
    nondet k = Set(CryptoCreateHash, BareCreateHash, Sha1Call, OtherCall).oneOf()
    nondet a = Set(Md5, Sha1Token, Sha1Hyphen, Md4, Ripemd, Sha256, NonLiteral).oneOf()
    nondet u = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all {
      kind' = k,
      alg' = a,
      securityUse' = u,
      testCtx' = tc, verdict' = (reports(k, a, u) and not(exempt(tc))),
    }
  }

  action init = step
}
