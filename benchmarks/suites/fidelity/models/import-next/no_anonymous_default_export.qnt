// Model of eslint-plugin-import-next/no-anonymous-default-export.
// A default export that is a function or class WITHOUT a name shows up as
// `default` in stack traces and tooling. The finding is an anonymous arrow
// (also wrapped in a TS `as`), an anonymous function expression or
// declaration, or an anonymous class expression or declaration - each unless
// its `allow*` option is on (arrow: allowArrowFunction; function:
// allowFunctionExpression; class: allowClassExpression). A NAMED function or
// class expression is not anonymous. Values that are not functions or classes
// (identifiers, member references, calls, `new`, literals, templates,
// objects, arrays, `satisfies` objects, interfaces) are not this rule's
// concern.
module no_anonymous_default_export {
  type Value = Arrow | ArrowAs | FnExpr | NamedFnExpr | AnonFnDecl | NamedFnDecl
    | ClassExpr | NamedClassExpr | AnonClassDecl | NamedClassDecl
    | Ident | Member | Call | New | Literal | Template | Obj | Arr | ObjSatisfies | Interface

  var value: Value
  var allowArrow: bool
  var allowClass: bool
  var allowFunction: bool
  var verdict: bool

  pure def reports(v: Value, aa: bool, ac: bool, af: bool): bool =
    (Set(Arrow, ArrowAs).contains(v) and not(aa))
    or (Set(FnExpr, AnonFnDecl).contains(v) and not(af))
    or (Set(ClassExpr, AnonClassDecl).contains(v) and not(ac))

  action step = {
    nondet v = Set(Arrow, ArrowAs, FnExpr, NamedFnExpr, AnonFnDecl, NamedFnDecl,
      ClassExpr, NamedClassExpr, AnonClassDecl, NamedClassDecl,
      Ident, Member, Call, New, Literal, Template, Obj, Arr, ObjSatisfies, Interface).oneOf()
    nondet aa = Set(true, false).oneOf()
    nondet ac = Set(true, false).oneOf()
    nondet af = Set(true, false).oneOf()
    all { value' = v, allowArrow' = aa, allowClass' = ac, allowFunction' = af,
          verdict' = reports(v, aa, ac, af) }
  }

  action init = step
}
