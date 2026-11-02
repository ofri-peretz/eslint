// Model of eslint-plugin-node-security/no-ecb-mode (CWE-327).
// ECB is reported wherever a Node crypto cipher is built with it, however the
// cipher factory is spelled and however Node accepts the algorithm name
// (OpenSSL names are case-insensitive). allowInTests (default false) silences
// the rule in a test file only, and only when set.
module no_ecb_mode {
  type Callee = CryptoDot | CryptoBracket | NamedImport | RenamedImport | RequireDestructured | NodeSpecifierNs | DecipherDot | UnrelatedObject
  type Alg = Aes128Ecb | Aes256EcbUpper | DesEcb | BfEcb | TemplateEcb | Gcm | Cbc | NonLiteral

  pure def isEcb(a: Alg): bool = match a {
    | Aes128Ecb => true
    | Aes256EcbUpper => true
    | DesEcb => true
    | BfEcb => true
    | TemplateEcb => true
    | Gcm => false
    | Cbc => false
    | NonLiteral => false
  }

  pure def isNodeCrypto(c: Callee): bool = match c {
    | UnrelatedObject => false
    | _ => true
  }

  pure def reports(c: Callee, a: Alg, allowInTests: bool, testFile: bool): bool =
    isNodeCrypto(c) and isEcb(a) and not(testFile and allowInTests)

  var callee: Callee
  var alg: Alg
  var allowInTests: bool
  var testFile: bool
  var verdict: bool

  action step = {
    nondet c = Set(CryptoDot, CryptoBracket, NamedImport, RenamedImport, RequireDestructured, NodeSpecifierNs, DecipherDot, UnrelatedObject).oneOf()
    nondet a = Set(Aes128Ecb, Aes256EcbUpper, DesEcb, BfEcb, TemplateEcb, Gcm, Cbc, NonLiteral).oneOf()
    nondet t = Set(true, false).oneOf()
    nondet tf = Set(true, false).oneOf()
    all { callee' = c, alg' = a, allowInTests' = t, testFile' = tf, verdict' = reports(c, a, t, tf) }
  }

  action init = step
}
