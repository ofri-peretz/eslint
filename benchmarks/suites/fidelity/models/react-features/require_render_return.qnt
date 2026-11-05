// Model of eslint-plugin-react-features/require-render-return.
// In a React class component (extends React's `Component` / `PureComponent`
// by binding, declared or as a class expression), `render` must return on
// every path that completes: a body with no return, an `if` that returns only
// on one branch, or a `switch` with no `default` falls off the end and is
// reported. Every path returning (`if`/`else`, `switch` with a returning
// `default`, `try`/`catch` both returning) is silent, and so is a body that
// only throws (no path completes). `render` written as an arrow class field
// is the same method: an expression body returns, a block body must return.
// A class that is not a React component may have a `render` with any
// contract.
// Left out: a class extending an undeclared bare `Component`.
module require_render_return {
  type Body = ReturnJsx | NoReturn | IfOnly | IfElse | SwitchNoDefault | SwitchDefault | Throws
            | TryBoth | FieldExpr | FieldBlockNoReturn | FieldBlockReturn
  type Super = Default | Named | Pure | Renamed | Namespace | Foreign | NoSuper
  type ClassForm = Decl | Expr

  pure def isReact(s: Super): bool = Set(Default, Named, Pure, Renamed, Namespace).contains(s)
  pure def missing(b: Body): bool = Set(NoReturn, IfOnly, SwitchNoDefault, FieldBlockNoReturn).contains(b)
  pure def reports(b: Body, s: Super): bool = isReact(s) and missing(b)

  var body: Body
  var sup: Super
  var classForm: ClassForm
  var verdict: bool

  action step = {
    nondet b = Set(ReturnJsx, NoReturn, IfOnly, IfElse, SwitchNoDefault, SwitchDefault, Throws,
                   TryBoth, FieldExpr, FieldBlockNoReturn, FieldBlockReturn).oneOf()
    nondet s = Set(Default, Named, Pure, Renamed, Namespace, Foreign, NoSuper).oneOf()
    nondet c = Set(Decl, Expr).oneOf()
    all { body' = b, sup' = s, classForm' = c, verdict' = reports(b, s) }
  }

  action init = step
}
