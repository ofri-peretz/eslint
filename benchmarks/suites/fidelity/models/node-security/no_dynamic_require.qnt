// Model of eslint-plugin-node-security/no-dynamic-require.
// A module load whose specifier can change at runtime is reported: a
// parameter, an import, a variable written more than once, or a template /
// concatenation over one of those. A specifier that resolves to constants
// (literal, plain template, const, __dirname + literal, path.join of
// __dirname and a literal) is silent. Every loader counts: require,
// module.require, and a require made by createRequire. allowPatterns matching
// the argument's source text suppresses the report. allowContexts suppresses
// every report in a file whose PATH marks a listed context (a substring test:
// test .test./.spec./__tests__, config config/webpack/rollup, build
// build/scripts/tools, runtime runtime/dynamic); a file of another context, or
// no option, changes nothing.
module no_dynamic_require {
  type Loader = Require | ModuleRequire | CreatedRequire
  type Arg = Literal | PlainTemplate | ConstTemplate | DirnameConcat | PathJoinLiteral | ConstName | Param | ParamTemplate | ParamConcat | Reassigned | ImportedName

  pure def canChange(a: Arg): bool = match a {
    | Param => true
    | ParamTemplate => true
    | ParamConcat => true
    | Reassigned => true
    | ImportedName => true
    | _ => false
  }

  // Prod: src/app.ts, no allowContexts. <X>Allowed: a file of context X with
  // allowContexts: [X]. ContextMismatch: a test file with allowContexts: ['config'].
  type Ctx = Prod | TestAllowed | ConfigAllowed | BuildAllowed | RuntimeAllowed | ContextMismatch

  pure def contextAllowed(c: Ctx): bool = c != Prod and c != ContextMismatch

  // allowPatterns: ['^pluginName$'] matches only the bare parameter
  pure def reports(l: Loader, a: Arg, allowParam: bool, c: Ctx): bool =
    canChange(a) and not(allowParam and a == Param) and not(contextAllowed(c))

  var loader: Loader
  var arg: Arg
  var allowParam: bool
  var ctx: Ctx
  var verdict: bool

  action step = {
    nondet l = Set(Require, ModuleRequire, CreatedRequire).oneOf()
    nondet a = Set(Literal, PlainTemplate, ConstTemplate, DirnameConcat, PathJoinLiteral, ConstName, Param, ParamTemplate, ParamConcat, Reassigned, ImportedName).oneOf()
    nondet p = Set(true, false).oneOf()
    nondet c = Set(Prod, TestAllowed, ConfigAllowed, BuildAllowed, RuntimeAllowed, ContextMismatch).oneOf()
    all { loader' = l, arg' = a, allowParam' = p, ctx' = c, verdict' = reports(l, a, p, c) }
  }

  action init = step
}
