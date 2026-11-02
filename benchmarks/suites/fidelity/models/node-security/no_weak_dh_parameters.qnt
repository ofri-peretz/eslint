// Model of eslint-plugin-node-security/no-weak-dh-parameters (CWE-326).
// getDiffieHellman / createDiffieHellmanGroup with a MODP group below
// minPrimeBits, createDiffieHellman(bits) below minPrimeBits, and createECDH on
// a weak curve (built-in list or additionalWeakCurves) are reported, whether
// the argument is a literal or a const followed to its literal. Unknown group
// names, the (prime, encoding) overload, and computed arguments are not.
module no_weak_dh_parameters {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Spelling = Member | Subscript | NamedImport | RequireNode
  type Call = GetDH | CreateGroup | CreateDH | CreateECDH
  // Weak / Strong / WeakConst / Computed / Other (unknown group name,
  // string-prime overload, or the curve only additionalWeakCurves names)
  type Arg = Weak | Strong | WeakConst | Computed | Other

  pure def reports(sp: Spelling, c: Call, a: Arg, strict: bool): bool = match a {
    | Weak => true
    | WeakConst => true
    | Computed => false
    // modp14 (2048) is below a 3072 floor; 3072 bits and prime256v1 are fine
    | Strong => strict and (c == GetDH or c == CreateGroup)
    // brainpoolP224r1 only when listed in additionalWeakCurves
    | Other => strict and c == CreateECDH
  }

  var spelling: Spelling
  var call: Call
  var arg: Arg
  var strict: bool
  var verdict: bool

  action step = {
    nondet sp = Set(Member, Subscript, NamedImport, RequireNode).oneOf()
    nondet c = Set(GetDH, CreateGroup, CreateDH, CreateECDH).oneOf()
    nondet a = Set(Weak, Strong, WeakConst, Computed, Other).oneOf()
    nondet st = Set(true, false).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { spelling' = sp, call' = c, arg' = a, strict' = st, testCtx' = tc, verdict' = (reports(sp, c, a, st) and not(exempt(tc))) }
  }

  action init = step
}
