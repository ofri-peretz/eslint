// Model of eslint-plugin-react-features/state-in-constructor.
// In a React class component (extends React's `Component` / `PureComponent`
// by binding, declared or as a class expression) initial state written as an
// instance class field (`state = {…}`, typed or with a computed `['state']`
// key) is reported: the documented convention is `this.state = …` in the
// constructor. Silent: state set in the constructor, no state at all, a
// type-only declaration that initializes nothing (`state!: S`), a `static`
// field (not instance state), and any non-React class.
// Left out: a class extending an undeclared bare `Component`, and a class
// that both declares the field and assigns it in the constructor.
module state_in_constructor {
  type StateField = Init | TypedInit | ComputedInit | DeclOnly | StaticInit | CtorAssign | NoState
  type Super = Default | Named | Pure | Renamed | Namespace | Foreign | NoSuper
  type ClassForm = Decl | Expr

  pure def isReact(s: Super): bool = Set(Default, Named, Pure, Renamed, Namespace).contains(s)
  pure def reports(f: StateField, s: Super): bool =
    isReact(s) and Set(Init, TypedInit, ComputedInit).contains(f)

  var stateField: StateField
  var sup: Super
  var classForm: ClassForm
  var verdict: bool

  action step = {
    nondet f = Set(Init, TypedInit, ComputedInit, DeclOnly, StaticInit, CtorAssign, NoState).oneOf()
    nondet s = Set(Default, Named, Pure, Renamed, Namespace, Foreign, NoSuper).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    all { stateField' = f, sup' = s, classForm' = c, verdict' = reports(f, s) }
  }

  action init = step
}
