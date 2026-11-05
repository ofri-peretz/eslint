// Model of eslint-plugin-maintainability/no-lonely-if.
// An `if` that is the ONLY statement of an `else` block reads as a nested
// level that `else if` would flatten. The rule reports exactly that shape -
// also when the lonely `if` has its own `else`, when it closes an `else if`
// chain, and when a comment sits beside it (a comment is not a statement).
// It does not report:
//   - an `if` that shares the `else` block with other statements (collapsing
//     it would strand them);
//   - an `if` nested in the consequent block (no `else` to merge into);
//   - an `else if` chain, which is already flat;
//   - an `else` block whose single statement is not an `if`.
// `allow` (default []) is in the schema but undocumented, and names nothing
// the rule can check structurally: it has no effect. It is sampled set to a
// word that appears in the file, to pin that a source substring does not
// switch the rule off.
module no_lonely_if {
  type Shape = Lonely | LonelyWithElse | LonelyAfterElseIf | LonelyBesideComment
    | WithSibling | InConsequent | ElseIfChain | ElseNonIf

  pure def lonely(s: Shape): bool =
    Set(Lonely, LonelyWithElse, LonelyAfterElseIf, LonelyBesideComment).contains(s)

  var shape: Shape
  var allowSet: bool
  var verdict: bool

  action step = {
    nondet s = Set(Lonely, LonelyWithElse, LonelyAfterElseIf, LonelyBesideComment,
                   WithSibling, InConsequent, ElseIfChain, ElseNonIf).oneOf()
    nondet a = Set(false, true).oneOf()
    all { shape' = s, allowSet' = a, verdict' = lonely(s) }
  }

  action init = step
}
