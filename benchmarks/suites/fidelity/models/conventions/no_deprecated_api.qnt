// Model of eslint-plugin-conventions/no-deprecated-api (CWE-1078).
// The user lists deprecated APIs by name (`apis`); the rule reports a use of
// one: a call of it (`oldFetch(x)`), a member of that name (`api.oldFetch`,
// `api['oldFetch']`), constructing it (`new OldClient()`), and calling it
// under a local name it was imported as (`import { oldFetch as fetchIt }`).
// The configured names are taken as given. It does not report the
// replacement API, another name, or anything at all while `apis` is empty
// (the default).
// `warnDaysBeforeRemoval` (default 90) is documented but decides nothing - a
// deprecated API is reported whatever its removal date; it is sampled at a
// non-default value to pin that.
module no_deprecated_api {
  type Spelling = BareCall | MemberCall | SubscriptCall | NewExpr | RenamedImportCall
    | Replacement | OtherName
  type Opt = Configured | WarnFlip | Unconfigured

  pure def deprecatedUse(s: Spelling): bool =
    Set(BareCall, MemberCall, SubscriptCall, NewExpr, RenamedImportCall).contains(s)
  pure def reports(s: Spelling, o: Opt): bool = o != Unconfigured and deprecatedUse(s)

  var spelling: Spelling
  var opt: Opt
  var verdict: bool

  action step = {
    nondet s = Set(BareCall, MemberCall, SubscriptCall, NewExpr, RenamedImportCall,
                   Replacement, OtherName).oneOf()
    nondet o = Set(Configured, WarnFlip, Unconfigured).oneOf()
    all { spelling' = s, opt' = o, verdict' = reports(s, o) }
  }

  action init = step
}
