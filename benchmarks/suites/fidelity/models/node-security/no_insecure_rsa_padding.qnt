// Model of eslint-plugin-node-security/no-insecure-rsa-padding (CWE-327).
// RSA_PKCS1_PADDING passed to any of the four RSA encrypt/decrypt calls is
// reported, whichever way the constant is spelled (crypto.constants.X,
// destructured constants, subscript, or its numeric value 1) and whichever
// way the function is reached. OAEP / PSS / no explicit padding are not.
module no_insecure_rsa_padding {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Fn = PrivateDecrypt | PublicDecrypt | PrivateEncrypt | PublicEncrypt | Sign
  type Access = Member | NamedImport | RequireNode | OptionsConst
  type Padding = CryptoConstants | DestructuredConstants | ConstantsSubscript | NumericOne | Oaep | Pss | Omitted

  pure def pkcs1(p: Padding): bool = match p {
    | CryptoConstants => true
    | DestructuredConstants => true
    | ConstantsSubscript => true
    | NumericOne => true
    | _ => false
  }

  pure def reports(f: Fn, a: Access, p: Padding): bool = f != Sign and pkcs1(p)

  var fn: Fn
  var access: Access
  var padding: Padding
  var verdict: bool

  action step = {
    nondet f = Set(PrivateDecrypt, PublicDecrypt, PrivateEncrypt, PublicEncrypt, Sign).oneOf()
    nondet a = Set(Member, NamedImport, RequireNode, OptionsConst).oneOf()
    nondet p = Set(CryptoConstants, DestructuredConstants, ConstantsSubscript, NumericOne, Oaep, Pss, Omitted).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { fn' = f, access' = a, padding' = p, testCtx' = tc, verdict' = (reports(f, a, p) and not(exempt(tc))) }
  }

  action init = step
}
