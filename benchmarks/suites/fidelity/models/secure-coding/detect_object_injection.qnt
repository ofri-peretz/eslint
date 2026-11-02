// Model of eslint-plugin-secure-coding/detect-object-injection (CWE-915).
// Contract: a computed member access `obj[key]` with a dynamic key the file
// cannot prove safe is reported as an assignment target, or as a read whose
// result is invoked (method injection: `obj[key]()`). A plain read cannot
// pollute a prototype and is out of scope by design (the description used to
// say "left- or right-hand assignment operand"; it was corrected to match).
// The documented safe twins are not reported: a null-prototype object, an
// allow-list `includes` guard, a hasOwnProperty guard. A literal dangerous
// property name (`obj['__proto__'] = v`) is reported as a write; a numeric
// literal index is not a property-name injection.
module detect_object_injection {
  type Key = DynKey | LiteralProto | NumIndex
  type Pos = Write | Read | Invoke
  type Guard = NoGuard | IncludesGuard | HasOwnGuard | NullProto

  pure def reports(k: Key, p: Pos, g: Guard): bool = match k {
    | DynKey => g == NoGuard and p != Read
    | LiteralProto => p == Write
    | NumIndex => false
  }

  var key: Key
  var pos: Pos
  var guard: Guard
  var verdict: bool

  action step = {
    nondet k = Set(DynKey, LiteralProto, NumIndex).oneOf()
    nondet p = (if (k == DynKey) Set(Write, Read, Invoke) else Set(Write, Read)).oneOf()
    nondet g = (if (k == DynKey) Set(NoGuard, IncludesGuard, HasOwnGuard, NullProto) else Set(NoGuard)).oneOf()
    all { key' = k, pos' = p, guard' = g, verdict' = reports(k, p, g) }
  }

  action init = step
}
