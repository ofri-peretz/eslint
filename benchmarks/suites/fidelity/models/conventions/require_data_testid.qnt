// Model of eslint-plugin-conventions/require-data-testid.
// E2E selectors need a stable `data-testid`. In scope: the native interactive
// elements (`button`, `input`, `select`, `textarea`, `form`), an `<a>` with
// `href` or `onClick`, a custom component (a name matching
// `componentPattern`, default `^[A-Z]`) that handles an `on*` event - or
// every component when `componentRequiresHandler: false` - and any name in
// `requireOn`. `ignore` takes a name out of scope.
// An in-scope element is reported when it has no `data-testid`, or when its
// value is not a string (the boolean shorthand `data-testid`) while
// `enforceStableValues` is on (default). It does not report:
//   - an element that spreads props (`{...props}`): the parent owns the id;
//   - a string literal, a template, or a reference to a value (`TEST_ID`,
//     `ids.submit`), or a choice between literals (`ok ? 'a' : 'b'`): all are
//     values the code fixes, not values that change between renders.
// Left out: candidate for change (fires on a guess) - a call as the value
// (`getTestId('x')`, `Math.random()`) is reported as unstable by the call's
// mere presence; whether it changes between renders is not in the code.
module require_data_testid {
  type Element = Button | AnchorHref | AnchorPlain | CompHandler | CompPlain | Thead
  type TestId = Missing | Literal | Template | Ident | Member | Conditional | Shorthand | Spread
  type Opt = Default | RequireOn | Ignore | PatternFlip | HandlerFlip | StableFlip

  pure def inScope(e: Element, o: Opt): bool =
    o != Ignore and (
      Set(Button, AnchorHref).contains(e)
      or (Set(CompHandler, CompPlain).contains(e) and o != PatternFlip
          and (e == CompHandler or o == HandlerFlip))
      or o == RequireOn)

  pure def reports(e: Element, t: TestId, o: Opt): bool =
    inScope(e, o) and t != Spread and (t == Missing or (t == Shorthand and o != StableFlip))

  var element: Element
  var testId: TestId
  var opt: Opt
  var verdict: bool

  action step = {
    nondet e = Set(Button, AnchorHref, AnchorPlain, CompHandler, CompPlain, Thead).oneOf()
    nondet t = Set(Missing, Literal, Template, Ident, Member, Conditional, Shorthand, Spread).oneOf()
    nondet o = Set(Default, RequireOn, Ignore, PatternFlip, HandlerFlip, StableFlip).oneOf()
    all { element' = e, testId' = t, opt' = o, verdict' = reports(e, t, o) }
  }

  action init = step
}
