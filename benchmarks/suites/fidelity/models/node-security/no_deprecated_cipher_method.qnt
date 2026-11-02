// Model of eslint-plugin-node-security/no-deprecated-cipher-method (CWE-327).
// Node's crypto.createCipher / createDecipher (no IV, MD5 key derivation) are
// reported however they are reached: member, static subscript, named or
// renamed import, require of `crypto` or `node:crypto`. createCipheriv is the
// safe twin, and a createCipher method on an unrelated library (node-forge)
// is not Node's deprecated API.
module no_deprecated_cipher_method {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Method = CreateCipher | CreateDecipher | CreateCipheriv
  type Access = Member | StaticSubscript | NamedImport | RenamedImport | RequireDestructured | RequireNodeNs | ForgeLibrary

  pure def deprecated(m: Method): bool = match m {
    | CreateCipher => true
    | CreateDecipher => true
    | CreateCipheriv => false
  }

  pure def reports(m: Method, a: Access): bool = deprecated(m) and a != ForgeLibrary

  var method: Method
  var access: Access
  var verdict: bool

  action step = {
    nondet m = Set(CreateCipher, CreateDecipher, CreateCipheriv).oneOf()
    nondet a = Set(Member, StaticSubscript, NamedImport, RenamedImport, RequireDestructured, RequireNodeNs, ForgeLibrary).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { method' = m, access' = a, testCtx' = tc, verdict' = (reports(m, a) and not(exempt(tc))) }
  }

  action init = step
}
