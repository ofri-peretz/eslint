// Model of eslint-plugin-react-features/prop-types.
// A React class component (extends React's `Component` / `PureComponent` by
// binding, declared or as a class expression) that reads `this.props` must
// declare its props: a `static propTypes` (any key spelling), a
// `Name.propTypes = …` assignment, or TypeScript props on the base class
// (`Component<Props>`) all declare them. Missing all of them is reported.
// `skipUndeclared: true` skips a component that never reads props; `ignore`
// skips the named components. A class that is not a React component is
// silent.
// Left out (judgment): a component that never reads props under the default
// `skipUndeclared: false` (nothing in the code needs a declaration), function
// components (the rule reads class components only), the `customValidators`
// option (documented as having no effect), and a class extending an
// undeclared bare `Component`.
module prop_types {
  type PropDecl = NoDecl | StaticField | ComputedField | AssignedAfter | TypedProps
  type Use = UsesProps | NoProps
  type Super = Default | Renamed | Foreign
  type ClassForm = Decl | Expr
  type Opt = Defaults | SkipUndeclared | IgnoreApp

  pure def reports(d: PropDecl, u: Use, s: Super, o: Opt): bool =
    s != Foreign and d == NoDecl and o != IgnoreApp and
    not(o == SkipUndeclared and u == NoProps)

  var decl: PropDecl
  var use: Use
  var sup: Super
  var classForm: ClassForm
  var opt: Opt
  var verdict: bool

  action step = {
    nondet d = Set(NoDecl, StaticField, ComputedField, AssignedAfter, TypedProps).oneOf()
    nondet u = Set(UsesProps, NoProps).oneOf()
    nondet s = Set(Default, Renamed, Foreign).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    nondet o = (if (u == NoProps) Set(SkipUndeclared, IgnoreApp)
                else Set(Defaults, SkipUndeclared, IgnoreApp)).oneOf()
    all { decl' = d, use' = u, sup' = s, classForm' = c, opt' = o,
          verdict' = reports(d, u, s, o) }
  }

  action init = step
}
