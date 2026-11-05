// Model of eslint-plugin-reliability/no-unsafe-type-narrowing (RSPEC-4326).
// Asserting a value to `unknown` (or `any`) and then to the type you want
// silences the checker exactly where it would have refused the conversion: a
// double assertion proves nothing about the value and narrows it anyway. The
// rule reports that double assertion in every spelling TypeScript has for it:
// `x as unknown as T`, `x as any as T`, the angle-bracket form
// `<T><unknown>x`, and the two mixed forms. A single assertion (`x as T`,
// `<T>x`), a widening to `unknown`, `as const` and `satisfies` are the
// checker's own business and are silent.
// `allowWithComment` (default false) accepts a double assertion with an
// explanatory comment on its own line just above it or trailing it on the same
// line; a comment trailing the PREVIOUS statement speaks for that statement.
// `ignoreInTests` (default true) exempts test files.
module no_unsafe_type_narrowing {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Focus = Shapes | AsComments | AngleComments
  type Shape = AsUnknownAs | AsAnyAs | AngleUnknown | AngleAny | MixedAngleOuter | MixedAsOuter
             | SingleAs | AsUnknownOnly | AsConst | Satisfies | AngleSingle
  type Comment = NoComment | OwnLineAbove | TrailingSameLine | TrailingPrevStatement

  pure def double(s: Shape): bool =
    Set(AsUnknownAs, AsAnyAs, AngleUnknown, AngleAny, MixedAngleOuter, MixedAsOuter).contains(s)
  pure def explained(c: Comment): bool = Set(OwnLineAbove, TrailingSameLine).contains(c)
  pure def reports(s: Shape, c: Comment, allowWithComment: bool): bool =
    double(s) and not(allowWithComment and explained(c))

  var focus: Focus
  var shape: Shape
  var comment: Comment
  var allowWithComment: bool
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Shapes, AsComments, AngleComments).oneOf()
    nondet s = (if (fo == Shapes)
                  Set(AsUnknownAs, AsAnyAs, AngleUnknown, AngleAny, MixedAngleOuter, MixedAsOuter,
                      SingleAs, AsUnknownOnly, AsConst, Satisfies, AngleSingle)
                else if (fo == AsComments) Set(AsUnknownAs)
                else Set(AngleUnknown)).oneOf()
    nondet c = (if (fo == Shapes) Set(NoComment)
                else Set(NoComment, OwnLineAbove, TrailingSameLine, TrailingPrevStatement)).oneOf()
    nondet a = (if (fo == Shapes) Set(false) else Set(false, true)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, shape' = s, comment' = c, allowWithComment' = a, testCtx' = tc,
          verdict' = (reports(s, c, a) and not(exempt(tc))) }
  }

  action init = step
}
