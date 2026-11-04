// Model of eslint-plugin-reliability/no-silent-errors (SonarQube RSPEC-1186).
// A catch block that does nothing swallows the error: nothing is logged,
// nothing is rethrown, and the failure vanishes. The rule reports a catch
// clause whose body holds no statement (an empty block, or only `;`), in every
// spelling of the clause: with a binding, without one (`catch {}`), followed by
// `finally`, inside an async function. A catch that does anything - logs,
// rethrows, returns a fallback, records a flag - handles the error and is
// silent. `allowWithComment` (default false) accepts an empty catch that
// carries a comment explaining why, inside the block or just above the clause;
// a comment far above, about something else, explains nothing.
// `ignoreInTests` (default true) exempts test files.
module no_silent_errors {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Focus = Bodies | Forms
  type Body = Empty | OnlySemicolon | CommentInside | CommentAbove | CommentFarAbove | Logs
            | Rethrows | ReturnsFallback | SetsFlag
  type Form = WithBinding | NoBinding | WithFinally | InAsync

  pure def empty(b: Body): bool =
    Set(Empty, OnlySemicolon, CommentInside, CommentAbove, CommentFarAbove).contains(b)
  pure def explained(b: Body): bool = Set(CommentInside, CommentAbove).contains(b)
  pure def reports(b: Body, allowWithComment: bool): bool =
    empty(b) and not(allowWithComment and explained(b))

  var focus: Focus
  var body: Body
  var form: Form
  var allowWithComment: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Bodies, Forms).oneOf()
    nondet b = (if (fo == Bodies)
                  Set(Empty, OnlySemicolon, CommentInside, CommentAbove, CommentFarAbove, Logs,
                      Rethrows, ReturnsFallback, SetsFlag)
                else Set(Empty, Logs)).oneOf()
    nondet f = (if (fo == Forms) Set(WithBinding, NoBinding, WithFinally, InAsync)
                else Set(WithBinding)).oneOf()
    nondet a = (if (fo == Bodies) Set(false, true) else Set(false)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, body' = b, form' = f, allowWithComment' = a, testCtx' = tc,
          verdict' = (reports(b, a) and not(exempt(tc))) }
  }

  action init = step
}
