// Model of eslint-plugin-conventions/analytics-event-naming.
// Analytics event names are a published schema. The rule reads the FIRST
// argument of the documented capture calls - the bare `track(...)` primitive
// and PostHog's `posthog.capture(...)` (dotted or string subscript) - and
// reports a name it can read statically that breaks the grammar
// `<category>:<object>_<verb>` (lowercase snake_case, verb from the fixed
// list); vendor-reserved `$` events are exempt. The name is read in every
// spelling: a quoted string, a template with no placeholder, and a `const`
// bound to one. A template literal WITH a placeholder is reported too: it
// mints an unbounded catalog of event names (ANALYTICS_PHILOSOPHY principle 3).
// It does not report:
//   - a valid name or a `$` vendor event;
//   - a name it cannot know (a parameter) - an unknown value is not a finding;
//   - the same string passed to an unrelated call.
// Left out: candidate for change (fires on a guess) - the rule treats ANY
// `<obj>.track(...)` / `<obj>.capture(...)` as an analytics call by the method
// name alone, whatever the receiver is.
module analytics_event_naming {
  type Callee = BareTrack | PosthogCapture | PosthogSubscript | OtherCall
  type Arg = Quoted | Template | ConstBound | Interpolated | Unknown
  type Name = Valid | Vendor | NotSnake | NoCategory | BadVerb

  pure def tracked(c: Callee): bool = c != OtherCall
  pure def invalid(n: Name): bool = Set(NotSnake, NoCategory, BadVerb).contains(n)
  pure def reports(c: Callee, a: Arg, n: Name): bool =
    tracked(c) and (a == Interpolated or (Set(Quoted, Template, ConstBound).contains(a) and invalid(n)))

  var callee: Callee
  var arg: Arg
  var name: Name
  var verdict: bool

  action step = {
    nondet c = Set(BareTrack, PosthogCapture, PosthogSubscript, OtherCall).oneOf()
    nondet a = Set(Quoted, Template, ConstBound, Interpolated, Unknown).oneOf()
    nondet n = Set(Valid, Vendor, NotSnake, NoCategory, BadVerb).oneOf()
    all { callee' = c, arg' = a, name' = n, verdict' = reports(c, a, n) }
  }

  action init = step
}
