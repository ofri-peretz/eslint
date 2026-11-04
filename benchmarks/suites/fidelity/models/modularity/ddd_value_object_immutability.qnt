// Model of eslint-plugin-modularity/ddd-value-object-immutability.
// A value object is defined by its value; if it can change after
// construction, two holders of "the same" value can drift apart. The rule
// reports a value-object class - named with one of `valueObjectPatterns`
// (default Value, VO, ValueObject) as a suffix - that declares instance state
// that can be reassigned:
//   - a class field without `readonly`;
//   - a constructor parameter property without `readonly`
//     (`constructor(public amount: number)`) - the same field, declared in the
//     constructor.
// It does not report a class that:
//   - declares only `readonly` fields and parameter properties;
//   - calls `Object.freeze(this)` in its constructor, while
//     `checkObjectFreeze` is true (the default). Freezing a nested value
//     (`Object.freeze(this.items)`) leaves the instance's own fields
//     writable, so it does not count;
//   - is not named as a value object.
// `requireReadonly: false` turns the readonly check - the rule's only check -
// off.
// Left out (judgment): static fields, `#private` fields, and mutable nested
// values behind a `readonly` field (`readonly items: string[]`).
module ddd_value_object_immutability {
  type Focus = Shapes | Options | Names
  type Members = AllReadonly | MutableField | MutableParamProp | ReadonlyParamProp | NoFields
  type Freeze = NoFreeze | FreezeThis | FreezeNested
  type Name = VoName | MoneyName

  pure def mutable(m: Members): bool = Set(MutableField, MutableParamProp).contains(m)
  pure def isVo(n: Name, customPattern: bool): bool =
    if (customPattern) n == MoneyName else n == VoName
  pure def reports(m: Members, f: Freeze, n: Name, cp: bool, rr: bool, cof: bool): bool =
    isVo(n, cp) and rr and mutable(m) and not(cof and f == FreezeThis)

  var focus: Focus
  var members: Members
  var freeze: Freeze
  var name: Name
  var customPattern: bool
  var requireReadonly: bool
  var checkObjectFreeze: bool
  var verdict: bool

  action step = {
    nondet fo = Set(Shapes, Options, Names).oneOf()
    nondet m = (if (fo == Shapes) Set(AllReadonly, MutableField, MutableParamProp, ReadonlyParamProp, NoFields)
                else if (fo == Options) Set(MutableField, MutableParamProp, AllReadonly)
                else Set(MutableField, AllReadonly)).oneOf()
    nondet f = (if (fo == Shapes) Set(NoFreeze, FreezeThis, FreezeNested)
                else if (fo == Options) Set(NoFreeze, FreezeThis)
                else Set(NoFreeze)).oneOf()
    nondet n = (if (fo == Names) Set(VoName, MoneyName) else Set(VoName)).oneOf()
    nondet cp = (if (fo == Names) Set(false, true) else Set(false)).oneOf()
    nondet rr = (if (fo == Options) Set(true, false) else Set(true)).oneOf()
    nondet cof = (if (fo == Options) Set(true, false) else Set(true)).oneOf()
    all { focus' = fo, members' = m, freeze' = f, name' = n, customPattern' = cp,
          requireReadonly' = rr, checkObjectFreeze' = cof, verdict' = reports(m, f, n, cp, rr, cof) }
  }

  action init = step
}
