// Model of eslint-plugin-react-features/component-api/no-is-prefix-prop (R8).
// A boolean prop is named for its true state (`looped`), not as a question
// (`isLooped`). Reported: a props member named `is` + an uppercase letter whose
// type is boolean, optional or not, also as `boolean | undefined`, in a
// `...Props` interface or type alias, with the key written
// as an identifier or quoted. Not reported: `is` alone, `island` (lowercase
// after `is`), a plain name, an `is`-prefixed prop that is not boolean, or the
// same member in an inline parameter type: since #1556 the rule only reads a
// member of an interface or type alias whose name ends in `Props` as a prop
// (the model's `PlayerProps`), so an inline type and a plain data type
// (`interface User { isAdmin: boolean }`) are left alone.
module no_is_prefix_prop {
  type Name = IsUpper | IsLower | IsOnly | Plain
  type Key = Ident | Quoted
  type Ty = BoolT | OptBool | BoolOrUndef | Str
  type Container = Interface | Alias | Inline

  pure def reports(n: Name, k: Key, t: Ty, c: Container): bool =
    n == IsUpper and t != Str and c != Inline

  var name: Name
  var keySp: Key
  var ty: Ty
  var container: Container
  var verdict: bool

  action step = {
    nondet n = Set(IsUpper, IsLower, IsOnly, Plain).oneOf()
    nondet k = Set(Ident, Quoted).oneOf()
    nondet t = Set(BoolT, OptBool, BoolOrUndef, Str).oneOf()
    nondet c = Set(Interface, Alias, Inline).oneOf()
    all { name' = n, keySp' = k, ty' = t, container' = c,
          verdict' = reports(n, k, t, c) }
  }

  action init = step
}
