// Model of eslint-plugin-maintainability/no-missing-error-context (RSPEC-1128).
// The same contract as eslint-plugin-reliability/no-missing-error-context (models/reliability/).
// A thrown value with no message, or one that is not an Error and so carries
// no stack, leaves whoever catches it without the context to act on it.
//   - requireMessage (default true): report a throw the code proves carries no
//     message: a built-in Error constructor (with or without `new`) given no
//     argument or an empty string, an empty string thrown as is, `null` /
//     `undefined`, an object literal with no `message` key. A rethrown binding,
//     a non-empty string or template, a `const` bound to one, an object literal
//     that has a `message`, and a subclass declared in the file whose
//     constructor passes a message to `super` all carry one.
//   - requireStackTrace (default false): report a throw the code proves is not
//     an Error: a primitive, an object literal, `null` / `undefined`, an
//     instance of a class declared in the file that does not extend Error.
//     Whether a class extends Error is decided by its declaration, never by
//     whether its NAME ends in "Error".
// Values the file cannot see into are left out of this model (see the PR).
// `ignoreInTests` (default true) exempts test files.
module no_missing_error_context {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Thrown = NewBuiltinLiteral | NewBuiltinEmpty | NewBuiltinEmptyString | NewBuiltinTemplate
              | CallBuiltinLiteral | CallBuiltinEmpty | ConstMessage | Rethrow | StringLiteral
              | EmptyString | TemplateLit | ObjectWithMessage | ObjectNoMessage | NullLit
              | UndefinedId | LocalSubclassSuperMessage | LocalSubclassNeutralName
              | LocalPlainClassNamedError

  pure def missingMessage(t: Thrown): bool =
    Set(NewBuiltinEmpty, NewBuiltinEmptyString, CallBuiltinEmpty, EmptyString, ObjectNoMessage,
        NullLit, UndefinedId).contains(t)
  pure def missingStack(t: Thrown): bool =
    Set(StringLiteral, EmptyString, TemplateLit, ObjectWithMessage, ObjectNoMessage, NullLit,
        UndefinedId, LocalPlainClassNamedError).contains(t)
  pure def reports(t: Thrown, requireMessage: bool, requireStackTrace: bool): bool =
    (requireMessage and missingMessage(t)) or (requireStackTrace and missingStack(t))

  var thrown: Thrown
  var requireMessage: bool
  var requireStackTrace: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet t = Set(NewBuiltinLiteral, NewBuiltinEmpty, NewBuiltinEmptyString, NewBuiltinTemplate,
                   CallBuiltinLiteral, CallBuiltinEmpty, ConstMessage, Rethrow, StringLiteral,
                   EmptyString, TemplateLit, ObjectWithMessage, ObjectNoMessage, NullLit,
                   UndefinedId, LocalSubclassSuperMessage, LocalSubclassNeutralName,
                   LocalPlainClassNamedError).oneOf()
    nondet rm = Set(true, false).oneOf()
    nondet rs = Set(false, true).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { thrown' = t, requireMessage' = rm, requireStackTrace' = rs, testCtx' = tc,
          verdict' = (reports(t, rm, rs) and not(exempt(tc))) }
  }

  action init = step
}
