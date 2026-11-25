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
// A `delete obj[key]` is a write (SPEC B5), but every object in this model is
// one the function builds itself: a const object literal or a null-prototype
// object (G1). Removing a key from that local is not reported. Reporting the
// const-literal case was tried on 2026-11-25 and added three false positives
// in NestJS (deletes from a local `{ ...process.env }` copy and from a local
// object's own keys), so it stays exempt. A delete on a parameter is a write;
// read-write-positions.test.ts pins that arm.
// Where the key comes from decides as much as the key's spelling:
//  - the index an Array listing (`Object.values(x).forEach((v, i) => …)`)
//    hands its callback is a Number, never a property name;
//  - a Map's `forEach` hands a string key, as dynamic as a parameter;
//  - a key bound from a const list of string literals, or from one slot of a
//    const list of string tuples, can only take values the file spells out,
//    so it is safe unless the list itself spells a dangerous name.
module detect_object_injection {
  type Key = DynKey | MapKey | LiteralProto | NumIndex | ArrayIndex | ListedKey | TupleSlot | ListedProto
  type Pos = Write | Delete | Read | Invoke
  type Guard = NoGuard | IncludesGuard | HasOwnGuard | NullProto

  pure def reports(k: Key, p: Pos, g: Guard): bool = p != Delete and match k {
    | DynKey => g == NoGuard and p != Read
    | MapKey => p != Read
    | LiteralProto => p == Write
    | NumIndex => false
    | ArrayIndex => false
    | ListedKey => false
    | TupleSlot => false
    | ListedProto => p != Read
  }

  var key: Key
  var pos: Pos
  var guard: Guard
  var verdict: bool

  action step = {
    nondet k = Set(DynKey, MapKey, LiteralProto, NumIndex, ArrayIndex, ListedKey, TupleSlot, ListedProto).oneOf()
    nondet p = (if (k == LiteralProto or k == NumIndex) Set(Write, Read) else Set(Write, Delete, Read, Invoke)).oneOf()
    nondet g = (if (k == DynKey) Set(NoGuard, IncludesGuard, HasOwnGuard, NullProto) else Set(NoGuard)).oneOf()
    all { key' = k, pos' = p, guard' = g, verdict' = reports(k, p, g) }
  }

  action init = step
}
