// Model of eslint-plugin-node-security/no-dynamic-dependency-loading (CWE-1104).
// Contract (docs): flags every require() argument / import() source that is
// not provably one of the strings written in the file -- no taint needed: a
// request value, a template with expressions, a concatenation, a config field
// all report. A string literal, a template with no expressions, and a variable
// holding a ternary of literals (one of two author-written names) are static. Position (top level vs inside a function)
// does not change the contract.
module no_dynamic_dependency_loading {
  type Loader = Require | DynamicImport
  type Arg = Literal | StaticTemplate | ReqVar | TemplateExpr | Concat | TernaryVar | ConfigMember
  type Pos = TopLevel | InFunction

  pure def reports(l: Loader, a: Arg, p: Pos): bool =
    a != Literal and a != StaticTemplate and a != TernaryVar

  var loader: Loader
  var arg: Arg
  var pos: Pos
  var verdict: bool

  action step = {
    nondet l = Set(Require, DynamicImport).oneOf()
    nondet a = Set(Literal, StaticTemplate, ReqVar, TemplateExpr, Concat, TernaryVar, ConfigMember).oneOf()
    nondet p = Set(TopLevel, InFunction).oneOf()
    all { loader' = l, arg' = a, pos' = p, verdict' = reports(l, a, p) }
  }

  action init = step
}
