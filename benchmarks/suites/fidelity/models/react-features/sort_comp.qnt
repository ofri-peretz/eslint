// Model of eslint-plugin-react-features/sort-comp.
// In a React class component (by binding, declared or as a class expression)
// members follow the group order: static variables, static methods, instance
// variables, lifecycle methods (the constructor included), everything else,
// `render`. A member that comes after a member of a later group is reported.
// A member name is read in every spelling (`['render']()`). The `order`
// option replaces the order (here: reversed). A class that is not a React
// component is silent.
// Left out (judgment): the order of lifecycles among themselves (the docs no
// longer claim it), `getDerivedStateFromProps` (both a static method and a
// lifecycle), and a class extending an undeclared bare `Component`.
module sort_comp {
  type Member = StaticVar | StaticMethod | InstanceVar | Ctor | Lifecycle | Other | Render
              | RenderComputed
  type Super = Default | Renamed | Foreign
  type ClassForm = Decl | Expr
  type Opt = Defaults | Reversed

  pure def rank(m: Member): int =
    if (m == StaticVar) 0
    else if (m == StaticMethod) 1
    else if (m == InstanceVar) 2
    else if (m == Ctor or m == Lifecycle) 3
    else if (m == Other) 4
    else 5
  pure def ranked(m: Member, o: Opt): int = if (o == Defaults) rank(m) else 5 - rank(m)
  pure def reports(a: Member, b: Member, s: Super, o: Opt): bool =
    s != Foreign and ranked(a, o) > ranked(b, o)

  var first: Member
  var second: Member
  var sup: Super
  var classForm: ClassForm
  var opt: Opt
  var verdict: bool

  action step = {
    nondet a = Set(StaticVar, StaticMethod, InstanceVar, Ctor, Lifecycle, Other, Render,
                   RenderComputed).oneOf()
    nondet b = Set(StaticVar, StaticMethod, InstanceVar, Ctor, Lifecycle, Other, Render,
                   RenderComputed).oneOf()
    nondet s = Set(Default, Renamed, Foreign).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    nondet o = Set(Defaults, Reversed).oneOf()
    all { first' = a, second' = b, sup' = s, classForm' = c, opt' = o,
          verdict' = reports(a, b, s, o) }
  }

  action init = step
}
