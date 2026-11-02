// Model of eslint-plugin-secure-coding/no-insecure-comparison (CWE-697).
// Contract: a loose `==` / `!=` is reported (while reportLooseEquality) unless
// both operands are provably the same type (a const-bound string literal or a
// template literal against a string literal) or it is the nullish idiom
// `x == null`. `== undefined` is a documented incorrect example. Strict
// equality is not a coercion finding. Secret detection matches identifier
// WORD segments, so `monkey` is not a secret; a comparison of a secret against
// a non-literal is a timing finding. reportLooseEquality:false only drops `==`
// between NON-secret operands ("keep only the secret-comparison findings").
module no_insecure_comparison {
  type Op = Eq | Neq | StrictEq
  type Left = Param | ConstStr | TemplateLit | Secret | Monkey
  type Right = StrLit | NullLit | UndefinedLit | OtherVar

  pure def reports(op: Op, l: Left, r: Right, reportLoose: bool): bool =
    val loose = Set(Eq, Neq).contains(op)
    val sameType = Set(ConstStr, TemplateLit).contains(l) and r == StrLit
    val looseFinding = loose and r != NullLit and not(sameType) and (reportLoose or l == Secret)
    val timing = l == Secret and r == OtherVar
    looseFinding or timing

  var op: Op
  var left: Left
  var right: Right
  var reportLoose: bool
  var verdict: bool

  action step = {
    nondet o = Set(Eq, Neq, StrictEq).oneOf()
    nondet l = Set(Param, ConstStr, TemplateLit, Secret, Monkey).oneOf()
    nondet r = Set(StrLit, NullLit, UndefinedLit, OtherVar).oneOf()
    nondet rl = Set(true, false).oneOf()
    all { op' = o, left' = l, right' = r, reportLoose' = rl, verdict' = reports(o, l, r, rl) }
  }

  action init = step
}
