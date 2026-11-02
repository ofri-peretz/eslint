// Model of eslint-plugin-node-security/no-deprecated-buffer (CWE-676).
// Contract (docs): `new Buffer(...)` and the `Buffer(...)` factory are
// deprecated whatever the argument (number, string, variable). The Node Buffer
// reached through node:buffer / buffer imports or an in-scope alias is the same
// constructor. Buffer.alloc / Buffer.from are the fix. A local shim class named
// Buffer is out of scope.
module no_deprecated_buffer {
  type Form = NewGlobal | CallGlobal | NewImportedNode | NewNamespaceMember
            | NewAlias | AllocSafe | FromSafe | LocalShim
  type Arg = Num | Str | Var

  pure def reports(f: Form, a: Arg): bool = match f {
    | NewGlobal => true
    | CallGlobal => true
    | NewImportedNode => true
    | NewNamespaceMember => true
    | NewAlias => true
    | AllocSafe => false
    | FromSafe => false
    | LocalShim => false
  }

  var form: Form
  var arg: Arg
  var verdict: bool

  action step = {
    nondet f = Set(NewGlobal, CallGlobal, NewImportedNode, NewNamespaceMember,
                   NewAlias, AllocSafe, FromSafe, LocalShim).oneOf()
    nondet a = Set(Num, Str, Var).oneOf()
    all { form' = f, arg' = a, verdict' = reports(f, a) }
  }

  action init = step
}
