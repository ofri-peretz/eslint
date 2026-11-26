// Model of eslint-plugin-grpc-security/no-unguarded-reflection (CWE-306).
// Server reflection lists every service on a listener to any client. A
// registration reports when nothing in the file stands between it and the
// program running. Registrations: `new ReflectionService(def).addToServer(s)`
// from @grpc/reflection (named, renamed, namespace, destructured or member
// require; inline or through a const) and `addReflection(s, path)` from
// grpc-server-reflection (named or member require). A same-named binding from
// a local module, or no reflection import at all, is not judged.
// Guards: an if body, an else arm, a ternary arm, the right side of &&, a
// switch case, a statement after `if (...) return`, a helper whose only call
// site is guarded, and a helper with no call site (exported). Not guards: top
// level, a callback, a main() called unconditionally, a helper with one
// unguarded call site, a loop body, the test of an if, the left side of &&,
// and a statement after an if whose body does not exit.
module no_unguarded_reflection {
  type Spelling =
    | Named | Renamed | Namespace | RequireDestructure | RequireMember
    | Legacy | LegacyRequire | NoImport | LocalImport
  type Binding = Inline | ViaConst
  type Placement =
    | TopLevel | IfBody | ElseArm | AndRight | TernaryArm | SwitchArm
    | AfterEarlyReturn | Callback | MainCalled | HelperGuarded
    | HelperUnguarded | HelperExported | LoopBody | IfTest | AndLeft
    | AfterNonExitingIf

  pure def judged(sp: Spelling): bool = sp != NoImport and sp != LocalImport

  pure def unguarded(p: Placement): bool = match p {
    | TopLevel => true
    | IfBody => false
    | ElseArm => false
    | AndRight => false
    | TernaryArm => false
    | SwitchArm => false
    | AfterEarlyReturn => false
    | Callback => true
    | MainCalled => true
    | HelperGuarded => false
    | HelperUnguarded => true
    | HelperExported => false
    | LoopBody => true
    | IfTest => true
    | AndLeft => true
    | AfterNonExitingIf => true
  }

  pure def reports(sp: Spelling, p: Placement): bool = judged(sp) and unguarded(p)

  var spelling: Spelling
  var binding: Binding
  var placement: Placement
  var verdict: bool

  action step = {
    nondet sp = Set(
      Named, Renamed, Namespace, RequireDestructure, RequireMember,
      Legacy, LegacyRequire, NoImport, LocalImport,
    ).oneOf()
    nondet b = Set(Inline, ViaConst).oneOf()
    nondet p = Set(
      TopLevel, IfBody, ElseArm, AndRight, TernaryArm, SwitchArm,
      AfterEarlyReturn, Callback, MainCalled, HelperGuarded,
      HelperUnguarded, HelperExported, LoopBody, IfTest, AndLeft,
      AfterNonExitingIf,
    ).oneOf()
    all {
      spelling' = sp, binding' = b, placement' = p,
      verdict' = reports(sp, p),
    }
  }

  action init = step
}
