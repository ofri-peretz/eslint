// Model of eslint-plugin-node-security/require-aead-tag-verification (CWE-327).
// A const/let decipher built by createDecipheriv with a literal AEAD algorithm
// (GCM, CCM, OCB, ChaCha20-Poly1305, in any case OpenSSL accepts) must call
// setAuthTag and final. Streamed or escaping deciphers, non-AEAD and computed
// algorithms are not judged.
module require_aead_tag_verification {
  // allowInTests (default false): on a test file the rule is silent only when the
  // option is set. TestDefault = src/app.test.ts with the option at its
  // default (reported as usual), TestFlip = the same file with allowInTests: true.
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestFlip
  var testCtx: TestCtx
  type Factory = CryptoDot | NamedImport | RenamedImport | RequireNode
  type Alg = Gcm | GcmUpper | Ccm | Ocb | Chacha | Cbc | Computed
  type Use = TagAndFinal | FinalOnly | TagOnly | UpdateOnly | Streamed | Returned

  pure def aead(a: Alg): bool = match a {
    | Gcm => true
    | GcmUpper => true
    | Ccm => true
    | Ocb => true
    | Chacha => true
    | Cbc => false
    | Computed => false
  }

  pure def unverified(u: Use): bool = match u {
    | FinalOnly => true
    | TagOnly => true
    | UpdateOnly => true
    | _ => false
  }

  pure def reports(f: Factory, a: Alg, u: Use): bool = aead(a) and unverified(u)

  var factory: Factory
  var alg: Alg
  var use: Use
  var verdict: bool

  action step = {
    nondet f = Set(CryptoDot, NamedImport, RenamedImport, RequireNode).oneOf()
    nondet a = Set(Gcm, GcmUpper, Ccm, Ocb, Chacha, Cbc, Computed).oneOf()
    nondet u = Set(TagAndFinal, FinalOnly, TagOnly, UpdateOnly, Streamed, Returned).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { factory' = f, alg' = a, use' = u, testCtx' = tc, verdict' = (reports(f, a, u) and not(exempt(tc))) }
  }

  action init = step
}
