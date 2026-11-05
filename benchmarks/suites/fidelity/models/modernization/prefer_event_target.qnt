// Model of eslint-plugin-modernization/prefer-event-target.
// Node's `events` EventEmitter does not exist in browsers; the platform
// EventTarget does. The rule reports code that uses Node's EventEmitter, found
// by where the binding comes from - `events` / `node:events` - in every
// spelling: a named or renamed import, the default import (the module's
// default export IS EventEmitter), a namespace member, a require destructure
// (plain or quoted key), the required module itself, or a member of the
// require call. It does not report:
//   - an EventEmitter from another module (Angular's `@angular/core` one is an
//     RxJS Subject, not Node's class) or a class the file declares itself;
//   - a parameter that happens to be named `events` (an unknown value);
//   - other `events` exports (`once`) and `EventTarget` itself.
// `allowEventEmitter: true` turns the rule off.
// Left out: an UNDECLARED global `EventEmitter` / `events.EventEmitter` - the
// rule reports it by name though no import proves it is Node's: candidate for
// change (fires on a guess).
module prefer_event_target {
  type Spelling = NamedImport | RenamedImport | NodePrefixImport | DefaultImport | NamespaceMember
    | RequireDestructure | RequireQuotedKey | RequireRoot | RequireMember
    | AngularImport | LocalClass | ParamNamedEvents | OnceImport | ExtendsEventTarget
  type Use = Extends | New

  pure def nodeEmitter(s: Spelling): bool =
    Set(NamedImport, RenamedImport, NodePrefixImport, DefaultImport, NamespaceMember,
        RequireDestructure, RequireQuotedKey, RequireRoot, RequireMember).contains(s)
  pure def reports(s: Spelling, allow: bool): bool = nodeEmitter(s) and not(allow)

  var spelling: Spelling
  var use: Use
  var allowEventEmitter: bool
  var verdict: bool

  action step = {
    nondet s = Set(NamedImport, RenamedImport, NodePrefixImport, DefaultImport, NamespaceMember,
                   RequireDestructure, RequireQuotedKey, RequireRoot, RequireMember,
                   AngularImport, LocalClass, ParamNamedEvents, OnceImport, ExtendsEventTarget).oneOf()
    nondet u = Set(Extends, New).oneOf()
    nondet a = Set(false, true).oneOf()
    all { spelling' = s, use' = u, allowEventEmitter' = a, verdict' = reports(s, a) }
  }

  action init = step
}
