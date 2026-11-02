// Model of eslint-plugin-browser-security/no-unvalidated-deeplinks (CWE-939).
// Linking.openURL(x) / navigation.navigate(x) report when x is a URL somebody
// OUTSIDE the app chose: the inbound deep link delivered on a Linking 'url'
// listener (`ev.url`, or `url` destructured off the event) or by
// getInitialURL(). React Navigation route params (`route.params.x`) are
// inbound deep-link data for openURL, which hands them to the OS scheme
// handler; for navigate() they name an in-app screen and are not reported.
// The inbound link opened inside an allowlist check (`if (ALLOWED.has(url))`)
// is validated and does not report; a truthiness check (`if (url)`) is not
// validation and still reports.
// A plain function parameter, a literal, or a template over a plain
// parameter is not proven deep-link data and does not report — the rule was
// narrowed from "any variable argument" to proven taint, and its doc now
// says so. `Linking` is resolved through the react-native import (a renamed
// import counts); another receiver's openURL is out of scope.
module no_unvalidated_deeplinks {
  type Sink = LinkingOpenURL | LinkingComputed | LinkingRenamed | NavigationNavigate | OtherOpenURL
  type Arg = Variable | EventMember | ListenerUrl | ListenerDestructured | InitialUrl | RouteParam | Literal | TplStatic | TplDynamic | GuardTruthy | ListenerAllowlisted | ListenerTruthy

  pure def inScope(s: Sink): bool = s != OtherOpenURL

  pure def deepLinkData(s: Sink, a: Arg): bool = match a {
    | ListenerUrl => true
    | ListenerDestructured => true
    | InitialUrl => true
    | RouteParam => s != NavigationNavigate
    | ListenerTruthy => true
    | _ => false
  }

  pure def reports(s: Sink, a: Arg): bool = inScope(s) and deepLinkData(s, a)

  var sink: Sink
  var arg: Arg
  var verdict: bool

  action step = {
    nondet s = Set(LinkingOpenURL, LinkingComputed, LinkingRenamed, NavigationNavigate, OtherOpenURL).oneOf()
    nondet a = Set(Variable, EventMember, ListenerUrl, ListenerDestructured, InitialUrl, RouteParam, Literal, TplStatic, TplDynamic, GuardTruthy, ListenerAllowlisted, ListenerTruthy).oneOf()
    all { sink' = s, arg' = a, verdict' = reports(s, a) }
  }

  action init = step
}
