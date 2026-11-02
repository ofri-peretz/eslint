// Model of eslint-plugin-node-security/no-static-iv (CWE-329).
// An IV passed to createCipheriv must be fresh per encryption. A literal
// string, Buffer.from of a literal (hex, base64 or array), Buffer.alloc with a
// literal size, or a const bound to one of those is static; randomBytes (direct
// or via a const) and a value from a parameter are not judged static.
module no_static_iv {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Callee = CryptoDot | CryptoBracket | NamedImport | RenamedImport | RequireNode
  type Iv = StringLit | BufferFromHex | BufferFromBase64 | BufferFromArray | BufferAllocZero | BufferAllocSize | ConstStatic | RandomBytes | ConstRandom | Param

  pure def isStatic(iv: Iv): bool = match iv {
    | StringLit => true
    | BufferFromHex => true
    | BufferFromBase64 => true
    | BufferFromArray => true
    | BufferAllocZero => true
    | BufferAllocSize => true
    | ConstStatic => true
    | RandomBytes => false
    | ConstRandom => false
    | Param => false
  }

  pure def reports(c: Callee, iv: Iv): bool = isStatic(iv)

  var callee: Callee
  var iv: Iv
  var verdict: bool

  action step = {
    nondet c = Set(CryptoDot, CryptoBracket, NamedImport, RenamedImport, RequireNode).oneOf()
    nondet v = Set(StringLit, BufferFromHex, BufferFromBase64, BufferFromArray, BufferAllocZero, BufferAllocSize, ConstStatic, RandomBytes, ConstRandom, Param).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { callee' = c, iv' = v, testCtx' = tc, verdict' = (reports(c, v) and not(exempt(tc))) }
  }

  action init = step
}
