// Model of eslint-plugin-node-security/no-sha1-hash (CWE-327).
// sha1 from the `crypto-hash` package is reported however it is bound: named
// or renamed import, namespace import, require (destructured or whole). sha256
// from the same package and sha1 from another package are not.
module no_sha1_hash {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Binding = Named | Renamed | Namespace | RequireDestructured | RequireWhole | OtherPackage
  type Fn = Sha1 | Sha256

  pure def reports(b: Binding, f: Fn): bool = f == Sha1 and b != OtherPackage

  var binding: Binding
  var fn: Fn
  var verdict: bool

  action step = {
    nondet b = Set(Named, Renamed, Namespace, RequireDestructured, RequireWhole, OtherPackage).oneOf()
    nondet f = Set(Sha1, Sha256).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { binding' = b, fn' = f, testCtx' = tc, verdict' = (reports(b, f) and not(exempt(tc))) }
  }

  action init = step
}
