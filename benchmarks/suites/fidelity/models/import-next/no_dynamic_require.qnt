// Model of eslint-plugin-import-next/no-dynamic-require (CWE-829).
// A module loaded by a computed name can be anything at runtime: `require`
// (always) and `import()` (with `esmodule: true`) whose argument is not a
// static string. Static means the value is fixed in the source: a string
// literal, a template with no substitutions, or a concatenation of those.
// A variable, a template with a substitution, a concatenation with a
// variable and a call are dynamic.
// left out (judgment): a `const` initialised to a literal (static by
// binding, but not this rule's literal-argument contract).
module no_dynamic_require {
  type Callee = Require | Import
  type Arg = Literal | Template | TemplateExpr | Ident | Concat | ConcatDynamic | CallArg

  pure def dynamic(a: Arg): bool = Set(TemplateExpr, Ident, ConcatDynamic, CallArg).contains(a)

  var callee: Callee
  var arg: Arg
  var esmodule: bool
  var verdict: bool

  action step = {
    nondet c = Set(Require, Import).oneOf()
    nondet a = Set(Literal, Template, TemplateExpr, Ident, Concat, ConcatDynamic, CallArg).oneOf()
    nondet e = Set(true, false).oneOf()
    all { callee' = c, arg' = a, esmodule' = e,
          verdict' = (dynamic(a) and (c == Require or e)) }
  }

  action init = step
}
