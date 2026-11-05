// Model of eslint-plugin-maintainability/no-nested-ternary.
// A conditional expression that holds another conditional expression as its
// test, consequent or alternate is hard to read. The rule reports it in every
// spelling: bare, parenthesized, and behind a TypeScript wrapper (`as`, `!`)
// that changes nothing at runtime. A single ternary is not reported.
// `allow` (default []) lists contexts where a nested ternary is accepted, each
// met when the outer ternary sits anywhere inside one of these:
//   - 'variable' - the initializer of a variable declaration;
//   - 'return'   - a return statement's argument;
//   - 'argument' - an argument of a call;
//   - 'jsx'      - a JSX expression container.
// A context the list does not name is still reported.
// Left out (judgment): a ternary reached through a function boundary or a call
// argument inside a branch (`a ? f(b ? 1 : 2) : 3`), which is not nesting in
// the expression the reader parses.
module no_nested_ternary {
  type Shape = Flat | InConsequent | InAlternate | InTest | Parenthesized | AsWrapped | NonNullWrapped
  type Ctx = VarInit | Return | Argument | Jsx | Assignment
  type Allow = AllowNone | AllowVariable | AllowReturn | AllowArgument | AllowJsx

  pure def allowed(c: Ctx, a: Allow): bool =
    (c == VarInit and a == AllowVariable)
      // the call and the JSX element below sit inside a return statement
      or (Set(Return, Argument, Jsx).contains(c) and a == AllowReturn)
      or (c == Argument and a == AllowArgument) or (c == Jsx and a == AllowJsx)

  pure def reports(s: Shape, c: Ctx, a: Allow): bool = s != Flat and not(allowed(c, a))

  var shape: Shape
  var ctx: Ctx
  var allow: Allow
  var verdict: bool

  action step = {
    nondet s = Set(Flat, InConsequent, InAlternate, InTest, Parenthesized, AsWrapped, NonNullWrapped).oneOf()
    nondet c = Set(VarInit, Return, Argument, Jsx, Assignment).oneOf()
    nondet a = Set(AllowNone, AllowVariable, AllowReturn, AllowArgument, AllowJsx).oneOf()
    all { shape' = s, ctx' = c, allow' = a, verdict' = reports(s, c, a) }
  }

  action init = step
}
