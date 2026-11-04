// Model of eslint-plugin-modernization/prefer-template-literal.
// A `+` chain that joins a string literal (or a template literal) with a
// runtime value is string building, and a template literal says it in one
// piece. The rule reports the root of a `+` chain when:
//   - at least one operand is a string literal or template literal - the code
//     proves the `+` is concatenation, not addition; and
//   - at least one operand is a runtime value (identifier, member, call),
//     anywhere in the chain - including inside a nested numeric sum
//     (`1 + n + 'px'`), which the template keeps as one `${1 + n}`.
// It does not report:
//   - pure literal joins (`'a' + 'b'`, `'w' + 100`): nothing runtime to
//     interpolate;
//   - `a + b` with no string literal: the operand types are unknown, so it
//     may be numeric addition (documented known false negative).
// A two- or three-operand chain, each operand one of five kinds.
module prefer_template_literal {
  type Operand = Str | Tmpl | Ident | Num | Call | Absent

  pure def isString(o: Operand): bool = Set(Str, Tmpl).contains(o)
  pure def isRuntime(o: Operand): bool = Set(Ident, Call).contains(o)
  pure def reports(a: Operand, b: Operand, c: Operand): bool =
    (isString(a) or isString(b) or isString(c)) and (isRuntime(a) or isRuntime(b) or isRuntime(c))

  var first: Operand
  var second: Operand
  var third: Operand
  var verdict: bool

  action step = {
    nondet a = Set(Str, Tmpl, Ident, Num, Call).oneOf()
    nondet b = Set(Str, Tmpl, Ident, Num, Call).oneOf()
    nondet c = Set(Str, Tmpl, Ident, Num, Call, Absent).oneOf()
    all { first' = a, second' = b, third' = c, verdict' = reports(a, b, c) }
  }

  action init = step
}
