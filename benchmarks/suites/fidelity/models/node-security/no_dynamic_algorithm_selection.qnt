// Model of eslint-plugin-node-security/no-dynamic-algorithm-selection (CWE-327).
// Contract (docs): reported when the algorithm argument of createHash,
// createHmac, createCipheriv, createDecipheriv, createSign or createVerify is
// not a static string: a parameter, process.env, a stored record field, a
// request value. Static literals (incl. a no-expression template) are fine, and
// so is a lookup into a const object literal whose values are all string
// literals (the documented allowlist). The crypto binding is resolved in any
// spelling (node:crypto, named/renamed import, destructured require, bracket);
// a local object with a createHash method is not crypto.
module no_dynamic_algorithm_selection {
  type Fn = CreateHash | CreateHmac | CreateCipheriv | CreateDecipheriv | CreateSign | CreateVerify
  type Binding = CjsCrypto | EsmNodeDefault | NamedRenamedNode | CjsDestructure | Bracket | LocalObject
  type Alg = Literal | StaticTemplate | Param | Env | RecordField | AllowlistConst | MutableTable

  pure def dynamicAlg(a: Alg): bool = match a {
    | Literal => false
    | StaticTemplate => false
    | Param => true
    | Env => true
    | RecordField => true
    | AllowlistConst => false
    | MutableTable => true
  }

  pure def reports(f: Fn, b: Binding, a: Alg): bool = b != LocalObject and dynamicAlg(a)

  var fn: Fn
  var binding: Binding
  var alg: Alg
  var verdict: bool

  action step = {
    nondet f = Set(CreateHash, CreateHmac, CreateCipheriv, CreateDecipheriv, CreateSign, CreateVerify).oneOf()
    nondet b = Set(CjsCrypto, EsmNodeDefault, NamedRenamedNode, CjsDestructure, Bracket, LocalObject).oneOf()
    nondet a = Set(Literal, StaticTemplate, Param, Env, RecordField, AllowlistConst, MutableTable).oneOf()
    all { fn' = f, binding' = b, alg' = a, verdict' = reports(f, b, a) }
  }

  action init = step
}
