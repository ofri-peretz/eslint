// Model of eslint-plugin-import-next/no-anonymous-default-export.
// Reads the default export the way eslint-plugin-import 2.32.0 does
// (src/rules/no-anonymous-default-export.js, `defs` at lines 12-61 and the
// report test at line 97): a default export is reported by its node type.
// Reported unless its option allows it: an anonymous arrow (also wrapped in a
// TS `as`, this rule's extension), an anonymous function or class, an array
// (`allowArray`), a literal or template literal (`allowLiteral`), an object
// (`allowObject`) and a `new` expression (`allowNew`). Calls are allowed by
// default (`allowCallExpression: true`, line 27). Not reported: identifiers,
// member references, interfaces, and an object behind a TS `satisfies` (a
// TSSatisfiesExpression node has no entry in `defs`). A NAMED function or
// class is not anonymous. The arrow / function / class switches in this
// model are allowArrowFunction, allowFunctionExpression, allowClassExpression.
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
    or Set(New, Literal, Template, Obj, Arr).contains(v)

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
