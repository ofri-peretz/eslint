// Model of eslint-plugin-node-security/no-weak-cipher-algorithm (CWE-327).
// A weak cipher (DES, 3DES, RC4, Blowfish, RC2, IDEA, plus any configured in
// additionalWeakCiphers) is reported wherever a Node crypto cipher or decipher
// is built with it: createCipheriv, createDecipheriv, and the deprecated
// createCipher. Every name OpenSSL accepts counts: case-insensitive, mode
// suffixes, and aliases ("blowfish", "des3").
module no_weak_cipher_algorithm {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Callee = CryptoDot | CryptoBracket | NamedImport | RenamedImport | RequireNode | DecipherDot | DeprecatedCreateCipher | UnrelatedObject
  type Alg = Des | DesEde3Upper | Des3Alias | Rc4 | Bf | Blowfish | Rc2Cbc | IdeaCbc | Cast5 | Aes | Chacha | NonLiteral

  pure def builtinWeak(a: Alg): bool = match a {
    | Des => true
    | DesEde3Upper => true
    | Des3Alias => true
    | Rc4 => true
    | Bf => true
    | Blowfish => true
    | Rc2Cbc => true
    | IdeaCbc => true
    | _ => false
  }

  pure def reports(c: Callee, a: Alg, extraCast5: bool): bool =
    c != UnrelatedObject and (builtinWeak(a) or (a == Cast5 and extraCast5))

  var callee: Callee
  var alg: Alg
  var extraCast5: bool
  var verdict: bool

  action step = {
    nondet c = Set(CryptoDot, CryptoBracket, NamedImport, RenamedImport, RequireNode, DecipherDot, DeprecatedCreateCipher, UnrelatedObject).oneOf()
    nondet a = Set(Des, DesEde3Upper, Des3Alias, Rc4, Bf, Blowfish, Rc2Cbc, IdeaCbc, Cast5, Aes, Chacha, NonLiteral).oneOf()
    nondet x = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { callee' = c, alg' = a, extraCast5' = x, testCtx' = tc, verdict' = (reports(c, a, x) and not(exempt(tc))) }
  }

  action init = step
}
