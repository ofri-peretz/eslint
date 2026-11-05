// Model of eslint-plugin-react-features/component-api/no-is-prefix-prop (R8).
// A boolean prop is named for its true state (`looped`), not as a question
// (`isLooped`). Reported: a props member named `is` + an uppercase letter whose
// type is boolean, optional or not, also as `boolean | undefined`, in an
// interface, a type alias or an inline parameter type, with the key written
// as an identifier or quoted. Not reported: `is` alone, `island` (lowercase
// after `is`), a plain name, or an `is`-prefixed prop that is not boolean.
// Left out: candidate for change (fires on a guess): the same member in a type
// that is not used as a component's props (`interface User { isAdmin:
// boolean }`); the rule reads every property signature as a prop.
module no_is_prefix_prop {
  type Name = IsUpper | IsLower | IsOnly | Plain
  type Key = Ident | Quoted
  type Ty = BoolT | OptBool | BoolOrUndef | Str
  type Container = Interface | Alias | Inline

  pure def reports(n: Name, k: Key, t: Ty, c: Container): bool =
    n == IsUpper and t != Str

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
