// Model of eslint-plugin-conventions/expiring-todo-comments.
// A TODO with an expiry condition is a promise; the rule reports it once the
// condition holds. A term (`terms`, default TODO / FIXME / XXX, matched case-
// insensitively as a word) followed by `[condition]:` is read; conditions:
//   - a date `[YYYY-MM-DD]`: expired on or after it;
//   - a version `[>=X.Y.Z]`: against the `version` of package.json;
//   - `[+pkg]`: expired once `pkg` is a dependency; `[-pkg]`: once it is not.
// Two conditions in one bracket are reported as malformed.
// It does not report a TODO without a condition, a condition that does not
// hold yet, or the term's letters inside another word (`mastodon [...]:`).
// `dateFormat` is accepted by the schema but has no effect (dates are always
// YYYY-MM-DD); it is sampled at a non-default value to pin that.
// The run's package.json is the repository root's (version 1.0.0, with
// `eslint` among its devDependencies).
// Left out (judgment): a bracket that is not a condition at all
// (`TODO [JIRA-123]: ...`, `TODO [12/01/2024]: ...`) - whether it is a
// malformed condition or a ticket reference is not in the code.
module expiring_todo_comments {
  type Term = Todo | Fixme | Lower | InWord | CustomTerm
  type Cond = PastDate | FutureDate | VersionReached | VersionNot | DepAddedPresent | DepAddedAbsent
    | DepRemovedPresent | DepRemovedAbsent | NoCond | Multiple
  type Opt = Default | CustomTerms | DateFormat

  pure def active(t: Term, o: Opt): bool =
    if (o == CustomTerms) t == CustomTerm else Set(Todo, Fixme, Lower).contains(t)
  pure def expired(c: Cond): bool =
    Set(PastDate, VersionReached, DepAddedPresent, DepRemovedAbsent).contains(c)
  pure def reports(t: Term, c: Cond, o: Opt): bool = active(t, o) and (expired(c) or c == Multiple)

  var term: Term
  var cond: Cond
  var opt: Opt
  var verdict: bool

  action step = {
    nondet t = Set(Todo, Fixme, Lower, InWord, CustomTerm).oneOf()
    nondet c = Set(PastDate, FutureDate, VersionReached, VersionNot, DepAddedPresent, DepAddedAbsent,
                   DepRemovedPresent, DepRemovedAbsent, NoCond, Multiple).oneOf()
    nondet o = Set(Default, CustomTerms, DateFormat).oneOf()
    all { term' = t, cond' = c, opt' = o, verdict' = reports(t, c, o) }
  }

  action init = step
}
