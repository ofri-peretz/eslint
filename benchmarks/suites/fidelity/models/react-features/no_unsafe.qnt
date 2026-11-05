// Model of eslint-plugin-react-features/no-unsafe.
// In a React class component (a class that extends React's `Component` or
// `PureComponent`, by binding: default / named / renamed / namespace import,
// declared or as a class expression) the legacy lifecycles
// `UNSAFE_componentWillMount`, `UNSAFE_componentWillReceiveProps` and
// `UNSAFE_componentWillUpdate` are reported, written as a method, an arrow
// class field or a computed key. With `checkAliases: true` the unprefixed
// `componentWillMount` / `componentWillReceiveProps` / `componentWillUpdate`
// are reported too. Safe lifecycles, a plain class and a class extending
// another library's `Component` are silent.
// Left out: a class extending an undeclared bare `Component` (the module is
// unknown; the rule keeps reading it by name) and `static` members.
module no_unsafe {
  type Method = UnsafeMount | UnsafeProps | UnsafeUpdate | LegacyMount | LegacyProps
              | LegacyUpdate | DidMount
  type Form = MethodDef | ArrowProp | ComputedKey
  type Super = Default | Named | Pure | Renamed | Namespace | Foreign | NoSuper
  type ClassForm = Decl | Expr
  type Opt = Defaults | Aliases

  pure def isReact(s: Super): bool = Set(Default, Named, Pure, Renamed, Namespace).contains(s)
  pure def flagged(m: Method, o: Opt): bool =
    Set(UnsafeMount, UnsafeProps, UnsafeUpdate).contains(m) or
    (o == Aliases and Set(LegacyMount, LegacyProps, LegacyUpdate).contains(m))
  pure def reports(m: Method, s: Super, o: Opt): bool = isReact(s) and flagged(m, o)

  var method: Method
  var form: Form
  var sup: Super
  var classForm: ClassForm
  var opt: Opt
  var verdict: bool

  action step = {
    nondet m = Set(UnsafeMount, UnsafeProps, UnsafeUpdate, LegacyMount, LegacyProps,
                   LegacyUpdate, DidMount).oneOf()
    nondet f = Set(MethodDef, ArrowProp, ComputedKey).oneOf()
    nondet s = Set(Default, Named, Pure, Renamed, Namespace, Foreign, NoSuper).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    nondet o = Set(Defaults, Aliases).oneOf()
    all { method' = m, form' = f, sup' = s, classForm' = c, opt' = o,
          verdict' = reports(m, s, o) }
  }

  action init = step
}
