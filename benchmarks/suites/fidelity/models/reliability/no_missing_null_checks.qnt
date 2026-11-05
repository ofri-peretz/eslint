// Model of eslint-plugin-reliability/no-missing-null-checks (CWE-476).
// Dereferencing a value that may be null or undefined throws a TypeError. The
// rule reports a dereference - `v.p`, `v['p']`, `v.m()`, destructuring
// `const { p } = v` - only when the file carries EVIDENCE the value may be
// null: a `let` never written, an initial `null` / `undefined` not written
// before the read (a write AFTER it cannot un-read the null), or a platform call documented to return null on a miss,
// called on a receiver the code shows is of that kind (an array parameter's
// `find`, a string's `match`, a regex literal's `exec`, `document`'s
// `querySelector` / `getElementById`). Any of these guards clears it:
// optional chaining, a truthy or `!= null` test enclosing the read (`if`,
// `&&`, `?:`), a falsy guard that leaves before the read (`return`, `throw`),
// a non-null assertion (the author's explicit claim), `??` before the read. A
// guard on a DIFFERENT binding clears nothing. A value with no evidence (an
// unknown call's result, a constructed object) is silent. A `null` that some
// path overwrites before the read (`if (flag) hit = pick()`) is judgment - the
// branch may be the lazy-init guard that makes the read safe - so it is silent.
// `ignoreInTests` (default true) exempts test files.
module no_missing_null_checks {
  type TestCtx = Prod | TestDefault | TestFlip
  pure def exempt(t: TestCtx): bool = t == TestDefault

  type Focus = Evidences | Guards | Derefs
  type Evidence = UninitLet | NullInit | UndefinedInit | ConditionalWrite | ArrayFind | StringMatch | RegexExec
                | QuerySelector | GetElementById | NoEvidence | NewObject
  type Guard = Unguarded | OptionalChain | IfTruthy | AndGuard | Ternary | NotNullCheck
             | EarlyReturn | EarlyThrow | NonNullAssertion | GuardOtherBinding | NullishFallback
  type Deref = Member | Bracket | MethodCall | Destructure

  pure def mayBeNull(e: Evidence): bool = not(Set(NoEvidence, NewObject, ConditionalWrite).contains(e))
  pure def unguarded(g: Guard): bool = Set(Unguarded, GuardOtherBinding).contains(g)
  pure def reports(e: Evidence, g: Guard): bool = mayBeNull(e) and unguarded(g)

  var focus: Focus
  var evidence: Evidence
  var guard: Guard
  var deref: Deref
  var testCtx: TestCtx
  var verdict: bool

  action step = {
    nondet fo = Set(Evidences, Guards, Derefs).oneOf()
    nondet e = (if (fo == Evidences)
                  Set(UninitLet, NullInit, UndefinedInit, ConditionalWrite, ArrayFind, StringMatch, RegexExec,
                      QuerySelector, GetElementById, NoEvidence, NewObject)
                else if (fo == Guards) Set(ArrayFind, NullInit)
                else Set(ArrayFind, QuerySelector)).oneOf()
    nondet g = (if (fo == Guards)
                  Set(Unguarded, OptionalChain, IfTruthy, AndGuard, Ternary, NotNullCheck,
                      EarlyReturn, EarlyThrow, NonNullAssertion, GuardOtherBinding, NullishFallback)
                else if (fo == Derefs) Set(Unguarded, IfTruthy)
                else Set(Unguarded)).oneOf()
    nondet d = (if (fo == Derefs) Set(Member, Bracket, MethodCall, Destructure)
                else Set(Member)).oneOf()
    nondet tc = Set(Prod, TestDefault, TestFlip).oneOf()
    all { focus' = fo, evidence' = e, guard' = g, deref' = d, testCtx' = tc,
          verdict' = (reports(e, g) and not(exempt(tc))) }
  }

  action init = step
}
