// Model of eslint-plugin-maintainability/error-message.
// The same contract as eslint-plugin-reliability/error-message (models/reliability/).
// Creating one of the language's own Error objects with no message leaves an
// empty line in every stack trace and monitor. The rule reports a built-in
// Error constructor (Error, TypeError, RangeError, SyntaxError, ReferenceError,
// EvalError, URIError) created with `new` or called without it, when the code
// proves the message is empty: no argument, `undefined`, or a string literal /
// template with nothing but whitespace in it. Any other expression may be a
// message, so it is silent. "Built-in" is decided by binding, not by name: a
// local class called `Error` is not the language's, and `globalThis.Error` is.
// A custom error class is out of scope. `allowEmptyCatch` (default false)
// accepts an empty Error created inside a catch block.
module error_message {
  type Focus = Ctors | Forms | Messages | Catches
  type Ctor = Error | TypeError | RangeError | SyntaxError | ReferenceError | EvalError | URIError
  type Form = New | Call | GlobalThisNew | GlobalThisCall | ShadowedLocal | CustomClass
  type Msg = Missing | EmptyLiteral | Blank | Literal | Template | EmptyTemplate | Variable
           | UndefinedArg | Concat
  type Place = ThrowOutside | AssignOutside | ThrowInCatch

  pure def builtin(f: Form): bool = not(Set(ShadowedLocal, CustomClass).contains(f))
  pure def empty(m: Msg): bool = Set(Missing, EmptyLiteral, Blank, EmptyTemplate, UndefinedArg).contains(m)
  pure def excused(p: Place, allowEmptyCatch: bool): bool = allowEmptyCatch and p == ThrowInCatch
  pure def reports(f: Form, m: Msg, p: Place, allowEmptyCatch: bool): bool =
    builtin(f) and empty(m) and not(excused(p, allowEmptyCatch))

  var focus: Focus
  var ctor: Ctor
  var form: Form
  var msg: Msg
  var place: Place
  var allowEmptyCatch: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Ctors, Forms, Messages, Catches).oneOf()
    nondet c = (if (fo == Ctors)
                  Set(Error, TypeError, RangeError, SyntaxError, ReferenceError, EvalError, URIError)
                else Set(Error)).oneOf()
    nondet f = (if (fo == Forms)
                  Set(New, Call, GlobalThisNew, GlobalThisCall, ShadowedLocal, CustomClass)
                else Set(New)).oneOf()
    nondet m = (if (fo == Messages)
                  Set(Missing, EmptyLiteral, Blank, Literal, Template, EmptyTemplate, Variable,
                      UndefinedArg, Concat)
                else Set(Missing, Literal)).oneOf()
    nondet p = (if (fo == Catches) Set(ThrowOutside, AssignOutside, ThrowInCatch)
                else Set(ThrowOutside)).oneOf()
    nondet a = (if (fo == Catches) Set(false, true) else Set(false)).oneOf()
    all { focus' = fo, ctor' = c, form' = f, msg' = m, place' = p, allowEmptyCatch' = a,
          verdict' = reports(f, m, p, a) }
  }

  action init = step
}
